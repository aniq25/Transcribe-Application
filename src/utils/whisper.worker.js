/*  1.) 'xenova/transformers' allows us to use models in hugging face
    2.) Hugging face is popular for its transformers library built for natural language processing applications 
    and its platform that allows users to share machine learning models and datasets and showcase their work.
    3.) It also includes a method called pipline which allows us to create a processing pipeline for transformer models.
*/
import { pipeline, env } from '@xenova/transformers';
import { MessageTypes } from './presets'

// Application won't store or retrieve data from the browser cache, ensuring that each operation fetches fresh data from the source.
env.allowLocalModels = false;
env.useBrowserCache = false;

class MyTranscriptionPipeline {
    /* 1.) static 'task' sets up a task for the pipeline to perform, in this case is 'automatic speech recognition'
       2.) static 'model' specifies the model to be used, in this case, a speech recognition model from OpenAI
       3.) static 'instance' will hold an instance (a single object) of the pipeline when it's created
    */
    static task = 'automatic-speech-recognition'
    static model = 'openai/whisper-tiny.en'
    static instance = null

    // Asynchronous method to get or create an instance of the pipeline
    static async getInstance(progress_callback = null) {
        // Creates an instance of the pipeline using the task and a model(null is used to indicate that the default static model should be used), optionally tracking progress
        if (this.instance === null) {
            this.instance = await pipeline(this.task, null, { progress_callback })
        }
        // Return the instance, whether it's newly created or already existing
        return this.instance
    }
}

// Sets up a listener that waits for messages sent to the worker. When a message arrives, it runs the function
self.addEventListener('message', async (event) => {
    /* 1.) Data sent to the worker is unpacked into two variables: type and audio.
       2.) Checks if the message type is a request for transcription (written out)
       3.) If it's a transcription request, it calls the transcribe function and waits for it to finish writing out content
    */
    const { type, audio } = event.data
    if (type === MessageTypes.INFERENCE_REQUEST) {
        await transcribe(audio)
    }
})

async function transcribe(audio) {
    sendLoadingMessage('loading')

    let pipeline //variable to hold the transcription model (pipeline).

    // Tries to get an instance of a transcription pipeline (a model that processes audio). It waits for the model to load.
    try {
        pipeline = await MyTranscriptionPipeline.getInstance(load_model_callback)
    } catch (err) {
        console.log(err.message)
    }

    sendLoadingMessage('success') // sends a message indicating model successfully loaded.

    const stride_length_s = 5 // sets how much audio is processed at a time (in seconds).

    // Creates an object to manage the transcription process.
    const generationTracker = new GenerationTracker(pipeline, stride_length_s)
    // Starts the transcription process, passing in the audio and various settings. It breaks the audio into chunks, processes each chunk, and generates text from it.
    await pipeline(audio, {
        top_k: 0,
        do_sample: false,
        chunk_length: 30,
        stride_length_s,
        return_timestamps: true,
        callback_function: generationTracker.callbackFunction.bind(generationTracker),
        chunk_callback: generationTracker.chunkCallback.bind(generationTracker)
    })
    generationTracker.sendFinalResult()
}

// This function is called while the model is loading, to report progress.
async function load_model_callback(data) {
    const { status } = data
    if (status === 'progress') {
        const { file, progress, loaded, total } = data
        sendDownloadingMessage(file, progress, loaded, total)
    }
}

// This function tells the main webpage what the current loading status
function sendLoadingMessage(status) {
    // self.postMessage sends a message from the worker thread (presets.js) to the main webpage as object that contains type/status
    self.postMessage({
        type: MessageTypes.LOADING,
        status
    })
}

// This function keeps the main webpage informed about how a file download is going
async function sendDownloadingMessage(file, progress, loaded, total) {
    // smillar to function above sends message as an object that contains type/file/progress/loaded/total
    // Object provides details about the download, like which file is being downloaded and how much of it has been completed.  
    self.postMessage({
        type: MessageTypes.DOWNLOADING,
        file,
        progress, // how much of the download has been completed.
        loaded, // how much data has been loaded so far.
        total // total amount of data that needs to be downloaded
    })
}

/*  This class manages the transcription process. It tracks the audio chunks, processes them, and handles callbacks during transcription.
    Main Functions: It breaks the audio into chunks, processes each chunk to generate text, and sends back partial or complete results to the main application. 
    It also handles errors and keeps track of progress.
*/
class GenerationTracker {
    constructor(pipeline, stride_length_s) {
        this.pipeline = pipeline
        this.stride_length_s = stride_length_s
        this.chunks = []
        this.time_precision = pipeline?.processor.feature_extractor.config.chunk_length / pipeline.model.config.max_source_positions
        this.processed_chunks = []
        this.callbackFunctionCounter = 0
    }

    // Sends a message from worker thread saying that the transcription is complete.
    sendFinalResult() {
        self.postMessage({ type: MessageTypes.INFERENCE_DONE })
    }

    // This function processes intermediate transcription results. It only runs every 10th time it is called (to avoid running too often).
    callbackFunction(beams) {
        this.callbackFunctionCounter += 1
        if (this.callbackFunctionCounter % 10 !== 0) {
            return
        }

        // Picks the best transcription result out of a list of options.
        const bestBeam = beams[0]
        // Converts the transcription data into readable text skipping special symbols.
        let text = this.pipeline.tokenizer.decode(bestBeam.output_token_ids, {
            skip_special_tokens: true
        })

        const result = {
            text, //Result
            start: this.getLastChunkTimestamp(), //Start time of chunk
            end: undefined //End time is not known yet
        }

        //Sends a partial result (a portion of the text) back to the main system.
        createPartialResultMessage(result)
    }

    // This function is called whenever a new piece of audio is processed. It adds the new piece to the list and processes all the chunks into text.
    chunkCallback(data) {
        this.chunks.push(data)
        const [text, { chunks }] = this.pipeline.tokenizer._decode_asr(
            this.chunks,
            {
                time_precision: this.time_precision,
                return_timestamps: true, // Want to know when each piece of text starts and ends.
                force_full_sequence: false
            }
        )

        this.processed_chunks = chunks.map((chunk, index) => {
            return this.processChunk(chunk, index)
        })

        // Sends the processed results back to the main system.
        createResultMessage(
            this.processed_chunks, false, this.getLastChunkTimestamp()
        )
    }

    // This function checks if there are any processed chunks and returns the timestamp of the last one
    getLastChunkTimestamp() {
        if (this.processed_chunks.length === 0) {
            return 0
        }
    }

    // This function processes an individual chunk of text.
    processChunk(chunk, index) {
        const { text, timestamp } = chunk // Get the text and timestamp from the chunk.
        const [start, end] = timestamp // Get the start and end times from the timestamp.

        // Return a processed chunk with the text including no extra spaces, start time, and end time.
        return {
            index,
            text: `${text.trim()}`,
            start: Math.round(start),
            end: Math.round(end) || Math.round(start + 0.9 * this.stride_length_s)
        }

    }
}

// This function creates and sends a message with the full transcription result.
function createResultMessage(results, isDone, completedUntilTimestamp) {
    // 'self.postMessage' to send a message from Web Worker to the main thread.
    self.postMessage({
        type: MessageTypes.RESULT,
        results,
        isDone, // A boolean (true or false) whether the transcription process is finished.
        completedUntilTimestamp // A timestamp showing how much of the audio has been transcribed up to this point.
    })
}

// // This function creates and sends a message with a partial transcription result.
function createPartialResultMessage(result) {
    // Same as above
    self.postMessage({
        type: MessageTypes.RESULT_PARTIAL,
        result
    })
}

