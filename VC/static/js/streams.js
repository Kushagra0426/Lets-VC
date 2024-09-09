require('dotenv').config();

const APP_ID = process.env.APP_ID // get the APP_ID from the .env file
const CHANNEL = sessionStorage.getItem('room')
const TOKEN = sessionStorage.getItem('token')
let UID = Number(sessionStorage.getItem('UID'));

let NAME = sessionStorage.getItem('name')

const client = AgoraRTC.createClient({mode:'rtc', codec:'vp8'})

let localTracks = []

let remoteUsers = {}

let joinAndDisplayLocalStream = async () => {
    document.getElementById('room-name').innerText = CHANNEL // set the room name

    client.on('user-published', handleUserJoined)
    client.on('user-left', handleUserLeft)

    try{
        await client.join(APP_ID, CHANNEL, TOKEN, UID) // join the channel
    } catch(error) {
        console.log(error)
        //window.open('/', '_self')
    }

    localTracks = await AgoraRTC.createMicrophoneAndCameraTracks() // create array of Audio/Video Tracks. arr[0] -> Audio, arr[1] -> Video

    let member = await createMember() // create a member in the room

    let player = `
    <div class="video-container" id="user-container-${UID}">
        <div class="username-wrapper"> 
            <span class="user-name">${member.name}</span> 
        </div>
        <div class="video-player" id="user-${UID}"></div>
    </div>
    `
    document.getElementById('video-streams').insertAdjacentHTML('beforeend', player) // insert the player div in the video-streams div

    localTracks[1].play(`user-${UID}`) // play video track in the div with id user-UID

    await client.publish([localTracks[0], localTracks[1]]) // publish the local tracks to the channel
}

let handleUserJoined = async (user, mediaType) => {
    remoteUsers[user.uid] = user
    await client.subscribe(user, mediaType) // subscribe to the user's mediaType

    if(mediaType === 'video') {
        let player = document.getElementById(`user-container-${user.uid}`) // get the player div

        if(player !== null) {
            player.remove() // remove the player div if it already exists
        }

        let member = await getMemeber(user) // get the member details

        player = `
        <div class="video-container" id="user-container-${user.uid}">
            <div class="username-wrapper"> 
                <span class="user-name">${member.name}</span> 
            </div>
            <div class="video-player" id="user-${user.uid}"></div>
        </div>
        `
        document.getElementById('video-streams').insertAdjacentHTML('beforeend', player) // insert the player div in the video-streams div

        user.videoTrack.play(`user-${user.uid}`) // play video track in the div with id user-UID
    }

    if(mediaType === 'audio') {
        user.audioTrack.play() // play audio track
    }
}

let handleUserLeft = async(user) => {
    delete remoteUsers[user.uid] // delete the user from the remoteUsers object

    let player = document.getElementById(`user-container-${user.uid}`) // get the player div

    if(player !== null) {
        player.remove() // remove the player div if it already exists
    }
}

let leaveAndRemoveLocalStream = async () => {
    for (let i=0; i<localTracks.length; i++) {
        localTracks[i].stop() // stop the local tracks
        localTracks[i].close() // close the local tracks
    }

    await client.leave() // leave the channel
    deleteMember() // delete the member from the room
    window.open('/', '_self') // redirect to home page
}

let toggleCamera = async (e) => {
    if(localTracks[1].muted){
        await localTracks[1].setMuted(false) // unmute the camera
        e.target.style.backgroundColor = '#fff' // change the background color of the button
    } else {
        await localTracks[1].setMuted(true) // mute the camera
        e.target.style.backgroundColor = 'rgb(255, 80, 80, 1)' // change the background color of the button
    }
}

let toggleMic = async (e) => {
    if(localTracks[0].muted){
        await localTracks[0].setMuted(false) // unmute the mic
        e.target.style.backgroundColor = '#fff' // change the background color of the button
    } else {
        await localTracks[0].setMuted(true) // mute the mic
        e.target.style.backgroundColor = 'rgb(255, 80, 80, 1)' // change the background color of the button
    }
}

let createMember = async () => {
    let response = await fetch('/createMember/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            'name': NAME,
            'UID': UID,
            'room_name': CHANNEL
        })
    })
    let member = await response.json()
    return member
}

let getMemeber = async (user) => {
    let response = await fetch(`/getMember/?UID=${user.uid}&room_name=${CHANNEL}`)
    let member = await response.json()
    return member
}

let deleteMember = async () => {
    let response = await fetch('/deleteMember/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            'name': NAME,
            'UID': UID,
            'room_name': CHANNEL
        })
    })
}

joinAndDisplayLocalStream() // join the channel and display the local stream

window.addEventListener('beforeunload', deleteMember) // delete the member from the room when the window is closed

document.getElementById('leave-btn').addEventListener('click',leaveAndRemoveLocalStream) // leave the channel and remove the local stream
document.getElementById('camera-btn').addEventListener('click',toggleCamera) // toggle the camera
document.getElementById('mic-btn').addEventListener('click',toggleMic) // toggle the mic