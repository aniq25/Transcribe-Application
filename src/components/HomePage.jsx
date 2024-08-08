import React, { useState, useEffect, useRef } from 'react'

export default function HomePage(props) {
    const { setAudioStream, setFile } = props

    const [recordingStatus, setRecordingStatus] = useState('inactive')
    const [audioChunks, setAudioChunks] = useState([]) // Initially set to an empty array showing no audio data has been captured yet.
    const [duration, setDuration] = useState(0) // Initially set to 0 since no recording has happened yet

    // 'mediaRecorder' is a variable that handles recording audio and 'useRef' is used to store a value that doesn’t change between re-renders of the comp.
    const mediaRecorder = useRef(null)

    //'mimeType' used to define the format of the audio that will be recorded.
    const mimeType = 'audio/webm'

    async function startRecording() {
        let tempStream
        console.log('Start recording')

        try {
            {/* 1.) 'streamData' stores permission to access the microphone and starts capturing audio.
                2.) 'getUserMedia' is a built-in function that lets you capture audio or video (in this case audio)
            */}
            const streamData = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false
            })

            tempStream = streamData// Store the captured audio stream in 'tempStream'.

        } catch (err) {
            console.log(err.message)
            return
        }

        // Update the status to 'recording' to show that recording has started.
        setRecordingStatus('recording')

        // Create a new 'MediaRecorder' object that will manage the recording process.
        const media = new MediaRecorder(tempStream, { type: mimeType })
        mediaRecorder.current = media

        mediaRecorder.current.start() // Start the recording process.
        let localAudioChunks = [] // Store small pieces of audio as they are captured

        // This function runs whenever a piece of audio is ready to be saved.
        mediaRecorder.current.ondataavailable = (event) => {
            if (typeof event.data === 'undefined') { return }
            if (event.data.size === 0) { return }
            localAudioChunks.push(event.data) // Add the captured audio piece to the array
        }

        // Store these captured audio pieces in state for later use.
        setAudioChunks(localAudioChunks)
    }

    async function stopRecording() {
        setRecordingStatus('inactive') // Update the status to 'inactive' to show that recording has stopped.
        console.log('Stop recording') 

        mediaRecorder.current.stop() // Stop the recording process.

        // This function runs whenever recording is stopped
        mediaRecorder.current.onstop = () => {
            // Create an object 'audioBlob' to combine all the captured audio pieces into one audio file.
            const audioBlob = new Blob(audioChunks, { type: mimeType })
            setAudioStream(audioBlob)
            // Store the final audio file (called a "blob") so it can be used or saved later.
            setAudioChunks([])
            setDuration(0)
        }
    }

    //useEffect hook is being used to set up a timer
    useEffect(() => {
        if (recordingStatus === 'inactive') { return }

        {/* 1.) This sets up a timer using setInterval. It executes the provided callback function every 1000 milliseconds  
            2.) 'curr' is the current state value this callback function increments the current duration by 1 each second.
        */}
        const interval = setInterval(() => {
            setDuration(curr => curr + 1)
        }, 1000)

        // This function stops the timer when comp is no longer in use
        return () => clearInterval(interval)
    })


    return (
        <main className='flex-1  p-4 flex flex-col gap-3 text-center sm:gap-4  justify-center pb-20'>

            <h1 className='font-semibold text-5xl sm:text-6xl md:text-7xl'>Free<span className='text-blue-400 bold'>Scribe</span></h1>

            {/* &rarr html element for arrow*/}
            <h3 className='font-medium md:text-lg'>Record <span className='text-blue-400'>&rarr;</span> Transcribe <span className='text-blue-400'>&rarr;</span> Translate</h3>

            {/* 1.) The button controls 'recoardingStatus' if status is recording onClick it will stop otherwise it will start recording
            2.) p tag will display 'recording/stop recording' message based on 'recordingStatus'
            3.) When recording it will turn mic icon read to indicate recording
            */}
            <button onClick={recordingStatus === 'recording' ? stopRecording : startRecording} className='flex specialBtn px-4 py-2 rounded-xl items-center text-base justify-between gap-4 mx-auto w-72 max-w-full my-4'>
                <p className='text-blue-400'>{recordingStatus === 'inactive' ? 'Record' : `Stop recording`}</p>
                <div className='flex items-center gap-2'>
                    {duration !== 0 && (
                        <p className='text-sm'>{duration}s</p>
                    )}
                    <i className={"fa-solid duration-200 fa-microphone " + (recordingStatus === 'recording' ? ' text-rose-300' : "")}></i>
                </div>
            </button>

            <p className='text-base'>Or 
                <label className='text-blue-400 cursor-pointer hover:text-blue-600 duration-200'>upload 
                    {/* Recieves an event object 'e' and accesses the first file in the FileList object and stores it in tempFile to store it for use in the comp. state */}
                    <input className='hidden' type='file' accept='.mp3,.wave' onChange={(e) => {
                        const tempFile = e.target.files[0]
                        setFile(tempFile)
                    }}/>
                </label> a mp3 file
            </p>

            <p className='italic text-slate-400'>Free now free forever</p>
        </main>
    )
}
