const fs = require('fs');

const generatedFilesPath = 'C:\\GRAM\\OneDrive - MRP TECHNOLOGY, S. DE R.L. DE C.V\\MRP_MHOBAK\\Proyectos\\Transporte\\RabbitMQMap\\generated\\';

const readJsonFile = (filepath) => {
    const data = fs.readFileSync(filepath);
    return JSON.parse(data);
};

const generateJsonFile = (data, filepath) => {
    // Remove the previous content or delete the file if it exists
    if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
    }
    // Write the new data to the file
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
}

const listeners = readJsonFile(generatedFilesPath + 'listeners.json');
const servicesMap = readJsonFile('MapeoProyectosServicios.json');

const uniquServiceNames = [...new Set(listeners.map(listener => listener.Service))].sort();
const uniquServiceNamesMap = [...new Set(servicesMap.map(listener => listener.ServiceName))];

uniquServiceNamesMap.forEach(element => {
    console.log(element);
});

const arrServices = [
    //Services names             RabbitMQ service names 
    {AppMonederoCommandService: "AppMonederoCommandService"},
    {AppMonederoQueryService: "AppMonederoQueryService"},
    {AppService: "AppService"},
    {AppTicketsService: "AppTicketsService"},
    {AppUsuariosCommandService: "AppUsuariosCommandService"},
    {AppUsuariosQueryService: "AppUsuariosQueryService"},
    {CatalogoService: "CatalogoService"},
    {ComercioCommandsService: "ComercioCommandsService"},
    {ComercioOrchestratorService: "ComercioOrchestratorService"},
    {ComercioQueryService: "ComercioQueryService"},
    {ComercioQueryService: "ComercioQueryUIService"},
    {CredencializacionService: "CredencializacionService"},
    {EstatusMonederoService: "EstatusMonederoService"},
    {MonederoCommandService: "MonederoCService"},
    {MonederoQueryService: "MonederoQService"},
    {NotificacionService: "NotificacionService"},
    {OpenLoopService: "OpenLoopService"},
    {PagosCommandService: "PagosCommandService"},
    {PagosQueryService: "PagosQuerysService"},
    {RidangoQueryService: "RidangoQueryService"},
    {RidangoSyncService: "RidangoSyncService"},
    {SeguridadService: "SeguridadService"},
    {SignalRService: "SignalRService"},
    {SincronizadorValidadorService: "SincronizadorValidadorService"},
    {TarifasService: "TarifasService"},
    {TaskSchedulerService: "TaskSchedulerService"},
    {TicketsService: "TicketsService"}
    
];

const rabbirtMqServicesMap = arrServices.map(element => {
    console.log(Object.keys(element)[0]," => ", Object.values(element)[0]); //select key and value

    return {
        ServiceName: Object.keys(element)[0],
        RabbitMQServiceName: Object.values(element)[0]
    }
});

console.log(rabbirtMqServicesMap);

generateJsonFile(rabbirtMqServicesMap, './rabbirtMqServicesMap.json');
