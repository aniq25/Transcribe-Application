import { pipeline, env } from '@xenova/transformers';
env.allowLocalModels = false;
env.useBrowserCache = false;

class MyTranslationPipeline {
    /* 1.) static 'task' sets up a task for the pipeline to perform, in this case is 'translation'
       2.) static 'model' specifies the model to be used, in this case, Xenova/nllb-200-distilled-600M
       3.) static 'instance' will hold an instance (a single object) of the pipeline when it's created
    */
    static task = 'translation';
    static model = 'Xenova/nllb-200-distilled-600M';
    static instance = null;

    // Asynchronous method to get or create an instance of the pipeline
    static async getInstance(progress_callback = null) {
        // Creates an instance of the pipeline using the task and a model(null is used to indicate that the default static model should be used), optionally tracking progress
        if (this.instance === null) {
            this.instance = pipeline(this.task, this.model, { progress_callback });
        }
         // Return the instance, whether it's newly created or already existing
        return this.instance;
    }
}

// / 'self.addEventListener' first listens for messages, then triggers a function to run
self.addEventListener('message', async (event) => {
    // Getting an instance of the translation pipeline
    let translator = await MyTranslationPipeline.getInstance(x => {
        self.postMessage(x) // Sends progress updates 
    })

    console.log(event.data)

    /*  1.) Performing the translation using the translator instance to translate'event.data.text' 
        2.) 'event.data.tgt_lang' is the target language (language to translate into)
        3.) 'event.data.src_lang' is the source language (language of the original text)
    */
    let output = await translator(event.data.text, {
        tgt_lang: event.data.tgt_lang,
        src_lang: event.data.src_lang,

         // 'callback_function' is used to send partial translations or updates back as they are processed
        callback_function: x => {
            self.postMessage({
                status: 'update',
                output: translator.tokenizer.decode(x[0].output_token_ids, { skip_special_tokens: true })
            })
        }
    })

    console.log('HEHEHHERERE', output)

    // Sending the final translation result back with a 'complete' status
    self.postMessage({
        status: 'complete',
        output
    })
})