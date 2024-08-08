import React, { useState, useEffect, useRef } from 'react'
import Transcription from './Transcription'
import Translation from './Translation'

export default function Information(props) {
    const { output, finished } = props
    const [tab, setTab] = useState('transcription')
    const [translation, setTranslation] = useState(null)
    const [toLanguage, setToLanguage] = useState('Select language')
    const [translating, setTranslating] = useState(null)
    console.log(output)

    // Creates a refrence to hold 'web worker' and iniate ML code in the backgroud
    const worker = useRef()

     // Create a new worker if there isn't one by using translate.worker.js(This file contains the background code that the worker will run.) 
    useEffect(() => {
        if (!worker.current) {
            worker.current = new Worker(new URL('../utils/translate.worker.js', import.meta.url), {
                type: 'module'
            })
        }

    // Function to handle messages received from the worker
    const onMessageReceived = async (e) => {
        // Check the status of the message received
        switch (e.data.status) {
            // If the status is 'initiate', it means the worker is starting to download something
            case 'initiate':
                console.log('DOWNLOADING')
                break;
            // If the status is 'progress', it means something is loading
            case 'progress':
                console.log('LOADING')
                break;
            // If the status is 'update', it means the worker has new translation output
            case 'update':
                setTranslation(e.data.output) // Update the translation with the new data
                console.log(e.data.output) 
                break;
            // If the status is 'complete', it means the task is done
            case 'complete':
                setTranslating(false) // Indicate that the translation process is finished
                console.log("DONE")
                break;
        }
    }

        worker.current.addEventListener('message', onMessageReceived)

        return () => worker.current.removeEventListener('message', onMessageReceived)
    })

    {/* Check if the current tab is set to 'transcription', if it is, map over the 'output' array to extract and return only the 'text' property from each item in the array,
        if not use the 'translation' variable instead and if it is undefined use an empty string as a fallback
    */}
    const textElement = tab === 'transcription' ? output.map(val => val.text) : translation || ''


    //'clupboard' used to store what you want to copy and 'writeText' method is what does the copying
    function handleCopy() {
        navigator.clipboard.writeText(textElement)
    }

    function handleDownload() {
        {/* 1.) Create an anchor and then an new empty file 
            2.) Create a temporary URL for the file so it can be downloaded
            3.) Set the name of the file to be downloaded
            4.) Add this new link (element) to the body of the HTML document so it can be clicked.
        */}
        const element = document.createElement("a")
        const file = new Blob([textElement], { type: 'text/plain' })
        element.href = URL.createObjectURL(file)
        element.download = `Freescribe_${new Date().toString()}.txt`
        document.body.appendChild(element)
        element.click()
    }

    function generateTranslation() {
        if (translating || toLanguage === 'Select language') {
            return
        }

        setTranslating(true)

        worker.current.postMessage({
            text: output.map(val => val.text),
            src_lang: 'eng_Latn',
            tgt_lang: toLanguage
        })
    }




    return (
        <main className='flex-1  p-4 flex flex-col gap-3 text-center sm:gap-4 justify-center pb-20 max-w-prose w-full mx-auto'>
            <h1 className='font-semibold text-4xl sm:text-5xl md:text-6xl whitespace-nowrap'>Your <span className='text-blue-400 bold'>Transcription</span></h1>

            <div className='grid grid-cols-2 sm:mx-auto bg-white  rounded overflow-hidden items-center p-1 blueShadow border-[2px] border-solid border-blue-300'>
                <button onClick={() => setTab('transcription')} className={'px-4 rounded duration-200 py-1 ' + (tab === 'transcription' ? ' bg-blue-300 text-white' : ' text-blue-400 hover:text-blue-600')}>Transcription</button>
                <button onClick={() => setTab('translation')} className={'px-4 rounded duration-200 py-1  ' + (tab === 'translation' ? ' bg-blue-300 text-white' : ' text-blue-400 hover:text-blue-600')}>Translation</button>
            </div>

            {/* 1.) Display onClick value based on what 'tab' is equal to
                2.) Giving access to props in this comp to transcription/translation comp 
            */}
            <div className='my-8 flex flex-col-reverse max-w-prose w-full mx-auto gap-4'>
                {(!finished || translating) && (
                    <div className='grid place-items-center'>
                        <i className="fa-solid fa-spinner animate-spin"></i>
                    </div>
                )}
                {tab === 'transcription' ? (
                    <Transcription {...props} textElement={textElement} />
                ) : (
                    <Translation {...props} toLanguage={toLanguage} translating={translating} textElement={textElement} setTranslating={setTranslating} setTranslation={setTranslation} setToLanguage={setToLanguage} generateTranslation={generateTranslation} />
                )}
            </div>

            <div className='flex items-center gap-4 mx-auto '>
                <button onClick={handleCopy} title="Copy" className='bg-white  hover:text-blue-500 duration-200 text-blue-300 px-2 aspect-square grid place-items-center rounded'>
                    <i className="fa-solid fa-copy"></i>
                </button>
                
                <button onClick={handleDownload} title="Download" className='bg-white  hover:text-blue-500 duration-200 text-blue-300 px-2 aspect-square grid place-items-center rounded'>
                    <i className="fa-solid fa-download"></i>
                </button>
            </div>
        </main>
    )
}
