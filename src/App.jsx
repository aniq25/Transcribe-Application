import { useState, useRef, useEffect } from 'react'
import HomePage from './components/HomePage'
import Header from './components/Header'
import FileDisplay from './components/FileDisplay'
import Information from './components/Information'
import Transcribing from './components/Transcribing'
import { MessageTypes } from './utils/presets'

function App() {
  const [file, setFile] = useState(null) //Initial file selection of .mp3/wave set to null
  const [audioStream, setAudioStream] = useState(null) //Initial set of live recording set to null
  const [output, setOutput] = useState(null)
  const [downloading, setDownloading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [finished, setFinished] = useState(false)

  const isAudioAvailable = file || audioStream

  // Clears all audio files
  function handleAudioReset() {
    setFile(null)
    setAudioStream(null)
  }


  // Creates a refrence to hold 'web worker' and iniate ML code in the backgroud
  const worker = useRef(null)

  useEffect(() => {
    // Create a new worker if there isn't one by using whisper.worker.js(This file contains the background code that the worker will run.) 
    if (!worker.current) {
      worker.current = new Worker(new URL('./utils/whisper.worker.js', import.meta.url), {
        type: 'module'
      })
    }

    // 'onMessageReceived' function will handle different types of messages that the worker might send back to the main application.
    const onMessageReceived = async (e) => {
      switch (e.data.type) {
        // Worker is downloading something
        case 'DOWNLOADING':
          setDownloading(true)
          console.log('DOWNLOADING')
          break;
        // Worker is loading some data or getting ready to do something
        case 'LOADING':
          setLoading(true)
          console.log('LOADING')
          break;
        // Show the result of whatever the worker was doing in the background.
        case 'RESULT':
          setOutput(e.data.results)
          console.log(e.data.results)
          break;
        // This means the worker has finished its task
        case 'INFERENCE_DONE':
          setFinished(true)
          console.log("DONE")
          break;
      }
    }

    // Tell the 'worker' to listen for messages and handle them using the onMessageReceived function
    worker.current.addEventListener('message', onMessageReceived)

    // When app stops using this 'worker' tell it to stop listening for messages as a cleanup function
    return () => worker.current.removeEventListener('message', onMessageReceived)
  })

  // Getting audio from the 'file/transcription'
  async function readAudioFrom(file) {
    {/* 1.) sampling_rate is set to 16000, which is a way to define how many times per second the audio is measured. 
        2.) 'audioCTX' is set up with the sampling rate we defined so that we can use it to work with audio in the browser
        3.) Store content from file in response and use 'audioCTX.decodeAudioData' to unpack the audio data so it can be used. 
        4.) 'decoded.getChannelData(0)' is how to get the actual sound data from the decoded audio, so that it can be returned and used.
    */}
    const sampling_rate = 16000
    const audioCTX = new AudioContext({ sampleRate: sampling_rate })
    const response = await file.arrayBuffer()
    const decoded = await audioCTX.decodeAudioData(response)
    const audio = decoded.getChannelData(0)
    return audio
  }

  // Checks if audio exists, prepares it, and then sends it off for further processing or analysis.
  async function handleFormSubmission() {
    if (!file && !audioStream) { return }

    {/* 1.) Stores audio in 'audio' obtained from 'readAudioFrom' function to get the processed audio data from 
        either the file or the live recording.
        2.) Sets a model name openai/whisper-tiny.en, which is a specific tool/model used to process/analyze the audio.
        3.) 'worker.current' function sends a message (postMessage) to a worker (a background task) with the type of request 
        (INFERENCE_REQUEST), the processed audio data, and the model name so that the audio can be transcribed 
   */}
    let audio = await readAudioFrom(file ? file : audioStream)
    const model_name = `openai/whisper-tiny.en`

    worker.current.postMessage({
      type: MessageTypes.INFERENCE_REQUEST,
      audio,
      model_name
    })
  }

  return (
    <div className='flex flex-col max-w-[1000px] mx-auto w-full'>
      <section className='min-h-screen flex flex-col'>
        <Header />
        {/* 1.) If 'output' exists render the Information comp. if not check if 'loading' exists 
            2.) If 'loading' exists render the Transcribing comp. if not check if 'isAudioAvailable' exists
            3.) If 'isAudioAvailable' exists render 'FileDisplay' comp. if not render 'HomePage' comp.
         */}
        {output ? (
          <Information output={output} finished={finished}/>
        ) : loading ? (
          <Transcribing />
        ) : isAudioAvailable ? (
          <FileDisplay handleFormSubmission={handleFormSubmission} handleAudioReset={handleAudioReset} file={file} audioStream={audioStream} />
        ) : (
          <HomePage setFile={setFile} setAudioStream={setAudioStream} />
        )}
      </section>
      <footer></footer>
    </div>
  )
}

export default App