const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

// Define the path to the JSON file
const filePath = path.join(__dirname, 'files/rabbit_mq-cluster-server-0.mq-cluster-nodes.default_2025-3-18.json');
const outputExcelPath = path.join(__dirname, 'genereted_files/rabbit_bindings.xlsx');

// Read the JSON file asynchronously
fs.readFile(filePath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading file:', err);
    return;
  }
  
  try {
    // Parse the JSON data
    const jsonData = JSON.parse(data);

    // Extract the "queues" and "bindings" arrays
    const queues = jsonData.queues || [];
    const bindings = jsonData.bindings || [];

    // Print the arrays
    //console.log('Queues:', queues);
    //console.log('Bindings:', bindings);
    //select the name propoerty of the queues, and make an array of the unique names of the queues
    let uniqueQueues = [...new Set(queues.map(queue => queue.name))];
    console.log('Number of unique queues:', uniqueQueues.length);
    
    // Create Excel workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('RabbitMQ Bindings');
    
    // Add headers
    worksheet.columns = [
      { header: 'Routing Key', key: 'routing_key', width: 40 },
      { header: 'Destination', key: 'destination', width: 50 },
      { header: 'Destination Service', key: 'destination_service', width: 30 }
    ];
    
    // Add rows
    bindings.forEach(binding => {
      // Extract service name from destination
      let destinationService = '';
      if (binding.destination) {
        const parts = binding.destination.split('.');
        if (parts.length > 0 && parts[0].toLowerCase().includes('service')) {
          destinationService = parts[0];
        }
      }

      worksheet.addRow({
        routing_key: binding.routing_key || '',
        destination: binding.destination || '',
        destination_service: destinationService
      });
    });
    
    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    
    // Save the workbook
    workbook.xlsx.writeFile(outputExcelPath)
      .then(() => {
        console.log(`Excel file saved successfully at: ${outputExcelPath}`);
      })
      .catch(error => {
        console.error('Error saving Excel file:', error);
      });
      
  } catch (error) {
    console.error('Error parsing JSON:', error);
  }
});