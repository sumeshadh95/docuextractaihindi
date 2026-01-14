const https = require('https');
const fs = require('fs');

const key = process.env.VITE_API_KEY || 'AIzaSyBzd1rOD0dMCkKqonX9dVgXi7LFDft_FYk';
console.log("Using key:", key);

const url = 'https://generativelanguage.googleapis.com/v1beta/models?key=' + key;

https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.error) {
                console.error("API Error:", JSON.stringify(json.error, null, 2));
            } else {
                const names = json.models.map(m => m.name);
                fs.writeFileSync('models_list.json', JSON.stringify(names, null, 2));
                console.log("Written models to models_list.json");
            }
        } catch (e) {
            console.error("Parse Error:", e);
            console.log("Raw Data:", data);
        }
    });
}).on('error', err => console.error("Net Error:", err));
