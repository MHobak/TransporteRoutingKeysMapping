const fs = require('fs');
const readline = require('readline');

const readLineFromFile = (filePath, lineNumber) => {
    return new Promise((resolve, reject) => {
        const readStream = fs.createReadStream(filePath);
        const rl = readline.createInterface({
            input: readStream,
            crlfDelay: Infinity
        });

        let currentLine = 0;
        rl.on('line', (line) => {
            currentLine++;
            if (currentLine === lineNumber) {
                rl.close();
                resolve(line);
            }
        });

        rl.on('close', () => {
            if (currentLine < lineNumber) {
                reject(new Error('Line number out of range'));
            }
        });

        rl.on('error', (error) => {
            reject(error);
        });
    });
};

// Example usage
const getLineFromFile = async (filePath, lineNumber) => {
    try {
        return await readLineFromFile(filePath, lineNumber);
    } catch (error) {
        console.error('Error reading file:', error);
        return null;
    }
}
    
module.exports = { getLineFromFile };