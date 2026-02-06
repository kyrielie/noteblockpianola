import { Sequencer, WorkletSynthesizer } from "spessasynth_lib";

const SOUND_BANK_PATH = "./minecraft2.sf2"; 
const WORKLET_PATH = "./node_modules/spessasynth_lib/dist/spessasynth_processor.min.js"; 
const MIDI_LIST_JSON = "./midilist.json"

let midiFiles = []; // Initialize as empty\
const context = new AudioContext();
let synth, seq;

async function init() {
    
    // Fetch the MIDI list from the JSON file
    const midiResponse = await fetch(MIDI_LIST_JSON);
    midiFiles = await midiResponse.json();

    await context.audioWorklet.addModule(WORKLET_PATH);
    const response = await fetch(SOUND_BANK_PATH);
    const sfFile = await response.arrayBuffer();
    
    synth = new WorkletSynthesizer(context);
    synth.connect(context.destination);
    await synth.soundBankManager.addSoundBank(sfFile, "main");
    
    seq = new Sequencer(synth);
    document.querySelector("#message").textContent = "Ready to play!";
}

// Helper: Fetch a MIDI and format it for the sequencer
async function getMidiBuffer(path) {
    const res = await fetch(path);
    const buf = await res.arrayBuffer();
    return { binary: buf, midiName: path.split('/').pop() };
}



// --- pause button ---
document.querySelector("#pause").addEventListener("click", () => {
    if (!seq) return; // Do nothing if sequencer isn't loaded

    if (seq.paused) {
        seq.play();
        document.querySelector("#pause").textContent = "Pause";
    } else {
        seq.pause();
        document.querySelector("#pause").textContent = "Resume";
    }
});

// --- shuffle button ---
document.querySelector("#shuffle").addEventListener("click", async () => {
    if (context.state === "suspended") await context.resume();
    
    // Shuffle the array
    const shuffled = [...midiFiles].sort(() => Math.random() - 0.5);
    
    // Load all buffers
    const songList = await Promise.all(shuffled.map(path => getMidiBuffer(path)));
    
    seq.loadNewSongList(songList);
    document.querySelector("#current_song").textContent = songList[0].midiName;
    seq.play();
});

// --- file upload button ---
document.querySelector("#midi_input").addEventListener("change", async (e) => {
    await context.resume();
    const file = e.target.files[0];
    if (!file) return;
    
    const buf = await file.arrayBuffer();
    seq.loadNewSongList([{ binary: buf, midiName: file.name }]);
    seq.play();
});

init();