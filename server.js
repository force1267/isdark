const { spawn } = require('child_process');
async function getBrain(data) {
    const py = spawn('python', ['brain.py', data]);
    console.log(`child process started.`);
    var result = "";
    py.stdout.on('data', (data) => {
        result += data.toString("ascii").replace("\r", "").replace("\n", "").replace(" ", "");
    });

    py.stderr.on('data', (data) => {
        console.log(`stderr: ${data}`);
    });

    return await new Promise((resolve, reject) => { 
        py.on('close', (code) => {
            console.log(`child process exited with code ${code}`);
            if(code == 0) {
                resolve(result);
            } else reject(code);
        });
    });
}


const express = require("express")
const bodyParser = require("body-parser")
const app = express()

app.use(bodyParser.json());
app.use("/", express.static("colory"))
app.post("/feed", async (req, res) => {
    try {
        const brain = await getBrain(JSON.stringify(req.body))
        res.json(brain);
    } catch(e) {
        res.json(`{"error": "runtime error", "code":"${e.toString()}"}`)
    }
})

app.listen(parseInt(process.argv[2]) || 80);
console.log(`http://localhost:${parseInt(process.argv[2]) || 80}`)