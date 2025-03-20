const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const readCsvFile = (filepath) => {
    return new Promise((resolve, reject) => {
        let results = [];
        fs.createReadStream(filepath)
        .pipe(csv({
            // These options will help ensure the headers are properly parsed
            trim: true,
            strict: true,
            mapHeaders: ({ header }) => header.trim()
        }))
        .on('data', (data) => {
            // Convert all property values to strings to ensure consistency
            const cleanData = {};
            for (const key in data) {
                cleanData[key] = data[key] !== null && data[key] !== undefined ? String(data[key]) : '';
            }
            results.push(cleanData);
        })
        .on('end', () => {
            resolve(results);
        })
        .on('error', (error) => {
            reject(error);
        });
    });
}

const getCsvContent = async (csv) => {
    try {
        return await readCsvFile(csv);
    } catch (error) {
        console.error('Error reading CSV file:', error);
    }
}

module.exports = { getCsvContent, readCsvFile };