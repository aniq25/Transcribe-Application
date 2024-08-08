import React, { useRef, useEffect } from 'react'

export default function FileDisplay(props) {
    const { handleAudioReset, file, audioStream, handleFormSubmission } = props
    
    // Create a reference to the audio element so we can have direct access to DOM Elements
    const audioRef = useRef()

    // This function will run when the component first loads by waiting for 'file' or 'audioStream' variables to change
    useEffect(() => {
        if (!file && !audioStream) { return }
        
        // If there is an uploaded file log to console a file was found and then create a temporary URL for the file so browser can use to play the audio vice versa for audioStream
        if (file) {
            console.log('HERE FILE', file)
            audioRef.current.src = URL.createObjectURL(file)
        } else {
            console.log('EHER AUDIO', audioStream)
            audioRef.current.src = URL.createObjectURL(audioStream)
        }
    }, [audioStream, file])


    return (
        <main className='flex-1  p-4 flex flex-col gap-3 text-center sm:gap-4 justify-center pb-20 w-full max-w-prose mx-auto'>
            <h1 className='font-semibold text-4xl sm:text-5xl md:text-6xl'>Your <span className='text-blue-400 bold'>File</span></h1>
            <div className=' flex flex-col text-left my-4'>
                <h3 className='font-semibold'>Name</h3>
                <p className='truncate'>{file ? file?.name : 'Custom audio'}</p>
            </div>
            <div className='flex flex-col mb-2'>
                {/* Since we used audioRef, we can directly interact with the <audio> element and set the ref to audioRef 
                    that we initalized eariler to display the audio file/stream
                */}
                <audio ref={audioRef} className='w-full' controls>
                    Your browser does not support the audio element.
                </audio>
            </div>
            <div className='flex items-center justify-between gap-4'>
                <button onClick={handleAudioReset} className='text-slate-400 hover:text-blue-600 duration-200'>Reset</button>
                <button onClick={handleFormSubmission} className='specialBtn  px-3 p-2 rounded-lg text-blue-400 flex items-center gap-2 font-medium '>
                    <p>Transcribe</p>
                    <i className="fa-solid fa-pen-nib"></i>
                </button>
            </div>
        </main>
    )
}
