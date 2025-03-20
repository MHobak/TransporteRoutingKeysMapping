const fs = require('fs');
const ExcelJS = require('exceljs');

const main = async () => { 
    const validMap = readJsonFile('genereted_files/servicesMap.json');
    const rabbitQueuesData = readJsonFile('files/rabbit_mq-cluster-server-0.mq-cluster-nodes.default_2025-3-18.json');
    const bindings = rabbitQueuesData.bindings || [];

    generateExcelFile(validMap, bindings, 'genereted_files/Mapeo RoutingKeys.xlsx');
};

const generateExcelFile = async (validMap, bindings, filePath) => {
    const workbook = new ExcelJS.Workbook();
    
    // Add first sheet - Servicios que publican
    const publishSheet = workbook.addWorksheet('Servicios que publican');
    
    // Define columns
    publishSheet.columns = [
        { header: 'Servicio', key: 'Service', width: 30 },
        { header: 'RoutingKey', key: 'RoutingKeyEnumDescription', width: 40 },
        { header: 'Ruta de acción envió', key: 'SenderShortFilePath', width: 60 },
        { header: 'Linea en código', key: 'SenderCodeLineNumber', width: 15 }
    ];
    
    // Add rows
    publishSheet.addRows(validMap);
    
    // Apply styles to the header row
    const headerRow = publishSheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' } // Light gray
    };
    
    // Add second sheet - Servicios que escuchan
    const listenSheet = workbook.addWorksheet('Servicios que escuchan');
    
    // Define columns
    listenSheet.columns = [
        { header: 'Servicio', key: 'destination', width: 30 },
        { header: 'RoutingKey', key: 'routing_key', width: 40 }
    ];
    
    // Add rows
    listenSheet.addRows(bindings);
    
    // Apply styles to the header row
    const listenHeaderRow = listenSheet.getRow(1);
    listenHeaderRow.font = { bold: true };
    listenHeaderRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' } // Light gray
    };
    
    // Save the workbook
    await workbook.xlsx.writeFile(filePath);
    console.log(`Excel file generated at: ${filePath}`);
};

const readJsonFile = (filepath) => {
    const data = fs.readFileSync(filepath);
    return JSON.parse(data);
};

main();