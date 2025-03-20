const fs = require('fs');
const path = require('path');
const { getCsvContent } = require('./extractor');
const { getLineFromFile } = require('./readfile');


const sendersReport = path.join(__dirname, 'files', 'MapeoServiciosQueEnvianMensajes.csv');
const sendersRoutesReport = path.join(__dirname, 'files', 'MapeoRoutingKeysEnProyectos.csv');
const servicesProjects = 'MapeoProyectosServicios.json';
const rabbitQueues = path.join(__dirname, 'files/rabbit_mq-cluster-server-0.mq-cluster-nodes.default_2025-3-18.json');

//Obtain the method calls from the services that send messages
let senderServices = [];
let routingkeys = [];
let servicesProjectMap = [];

const main = async () => {

    //read a json file
    servicesProjectMap = readJsonFile(servicesProjects);

    // 1. Read the CSV file with the senders report
    senderServices = await getCsvContent(sendersReport);

    const senderServicesFinal = senderServices.map(item => {
        const service = findService(item.Location);
        const shortpath = //remove all the characters bejore the service folder name starts
            item.Location.substring(item.Location.indexOf(service.ServiceProyectFolder));
        return {
            FilePath: item.Location + item.Name,
            ShortFilePath: shortpath + item.Name,
            Line: item.Line,
            RoutingKey: extractRoutekey(item.Text),
            CodeLine: item.Text.trim(),
            Service: service ? service.ServiceName : null,
        }
    });

    //filter the services that doesnt have a routing key
    const filtered = senderServicesFinal.filter(item => item.RoutingKey == null);

    // 2. Extract the service names and the RoutingKeys calls
    routingkeys = await getCsvContent(sendersRoutesReport);
    //const keys = [...new Set(routingkeys.map(item => item.Location))];

    // 3. Get the routing keys enum values
    // First, create an array of objects with promises
    const routingKeysPromises = routingkeys.map(item => {
        return {
            FilePath: item.Location + item.Name,
            RoutingKey: item.Text.trim().replace('RoutingKeys.', '').replace('[Description("', '').replace('")]', ''),
            Line: Number(item.Line),
            ValueLine: item.Line ? Number(item.Line) + 1 : null,
            EnumValuePromise: getLineFromFile(item.Location + item.Name, Number(item.Line) + 1)
        }
    });

    // Then, resolve all the promises to get the actual values
    const routingKeysMap = await Promise.all(
        routingKeysPromises.map(async item => {
            return {
                ...item,
                EnumValue: await item.EnumValuePromise,
                EnumValuePromise: undefined // Remove the promise from the final result
            };
        })
    );

    // 4. Create a map of routing keys with the enum values and the service that uses them
    const routingKeysMapFinal = routingKeysMap.map(item => {
        const service = findService(item.FilePath);
        const shortpath = //remove all the characters bejore the service folder name starts
            item.FilePath.substring(item.FilePath.indexOf(service.ServiceProyectFolder));
        return {
            ...item,
            ShortFilePath: shortpath,
            Service: service ? service.ServiceName : null,
            RoutingKey: item.RoutingKey,
            // this is a string value lioke 'AutobusValidadorGuardar = 233', 
            //everthing after the = should be removed from the string including the = character and spaces
            //the final result should be 'AutobusValidadorGuardar'
            EnumValue: item.EnumValue ? item.EnumValue.split('=')[0].trim() : null
        }
    });

    // 5. Create a map of the services that send messages with the routing keys they use
    const servicesMap = senderServicesFinal.map(item => {
        const routingKey = routingKeysMapFinal.find(routingKey => 
            routingKey.Service === item.Service && 
            routingKey.EnumValue === item.RoutingKey
        );
        return {
            Service: item.Service,
            SenderFilePath: item.FilePath,
            SenderShortFilePath: item.ShortFilePath,
            SenderRoutingKeyPath: routingKey ? routingKey.FilePath : null,
            SenderCodeLineNumber: item.Line,
            SenderCodeLine: item.CodeLine,
            SenderRoutingKey: item.RoutingKey,
            RoutingKeyEnumFilePath: routingKey ? routingKey.FilePath : null,
            RoutingKeyEnumShortFilePath: routingKey ? routingKey.ShortFilePath : null,
            RoutingKeyEnumValueLineNumber: routingKey ? routingKey.ValueLine : null,
            RoutingKeyEnumValue: routingKey ? routingKey.EnumValue : null,
            RoutingKeyEnumDescription: routingKey ? routingKey.RoutingKey : null,
            RoutingKeyEnumDescriptionLineNumber: routingKey ? routingKey.Line : null,
            id: crypto.randomUUID()
        }
    });

    const validMap = servicesMap.filter(item => item.RoutingKeyEnumValue != null);


    //filter the services that doesnt call rabbitMQ
    const exceptions = servicesMap.filter(item => item.RoutingKeyEnumValue == null 
        && !item.SenderCodeLine.includes('notificationsService.SendAsync') 
        && !item.SenderCodeLine.includes('rabbitNotifications.SendAsync'));


    //filter the services that doesnt have a routing key and are not exceptions
    const notFound = servicesMap.filter(item => 
        item.RoutingKeyEnumValue == null 
        && !exceptions.some(exception => exception.id === item.id));

    //const notFound = servicesMap.filter(item => item.RoutingKeyEnumValue == null && item.SenderCodeLine.includes('notificationsService.SendAsync'));

    // 6. Generate a JSON file with the services map and the not found routing keys
    generateJsonFile(validMap, 'genereted_files/servicesMap.json');
    generateJsonFile(exceptions, 'genereted_files/exceptions.json');
    generateJsonFile(notFound, 'genereted_files/notFound.json');

    console.log('Total:', servicesMap.length);
    console.log('Valid:', validMap.length);
    console.log('Exceptions:', exceptions.length);
    console.log('Not Found:', notFound.length);
}   

const readJsonFile = (filepath) => {
    const data = fs.readFileSync(filepath);
    return JSON.parse(data);
};

const findService = (serviceFolder) => {
    const map = servicesProjectMap.find(service => serviceFolder.includes(service.ServiceProyectFolder));
    return map ? map : null;
}

const generateJsonFile = (data, filepath) => {
    // Remove the previous content or delete the file if it exists
    if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
    }
    // Write the new data to the file
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
}

const extractRoutekey = (line) => {
    //Extrct the routing key from the line, for example:  await _notificationsService.SendAsync<EntCuReplicaAutobusValidador>(RoutingKeys.AutobusValidadorGuardar.GetDescription(), _exchangeConfig, queue);'
    //The routing key is the first parameter of the SendAsync method: RoutingKeys.AutobusValidadorGuardar.GetDescription()
    //The final result should be: AutobusValidadorGuardar before the GetDescription method
    //Sometimes the routing key is a string or a variable, so the result should be the string value or the variable name
    //The routing key is always the first parameter of the SendAsync method

    let sendAsyncPattern = /SendAsync<.*?>\(([^,)]*)/;
    let match = line.match(sendAsyncPattern);
    
    // If no match, try to match SendAsync() pattern without generic type
    if (!match) {
        sendAsyncPattern = /SendAsync\(([^,)]*)/;
        match = line.match(sendAsyncPattern);
    }
    
    if (match) {
        const routingKeyExpression = match[1].trim();
        if (routingKeyExpression.includes('.GetDescription')) {
            const routingKeyParts = routingKeyExpression.split('.');
            return routingKeyParts[routingKeyParts.length - 2];
        } else if (routingKeyExpression.startsWith('"') && routingKeyExpression.endsWith('"')) {
            return routingKeyExpression.slice(1, -1);
        } else {
            return routingKeyExpression;
        }
    }
    return null;
}

const Test = () => {
    console.log('Runnign test...');
    console.log('method: extractRoutekey');
    const exampleLine = "await _notificationsService.SendAsync<EntCuReplicaAutobusValidador>(RoutingKeys.AutobusValidadorGuardar.GetDescription(), _exchangeConfig, queue);";
    const exampleLine1 = "await _notificationsService.SendAsync<EntCuReplicaAutobusValidador>(routingkey, _exchangeConfig, queue);";
    const exampleLine2 = 'await _notificationsService.SendAsync<EntCuReplicaAutobusValidador>("Catalogos.TipoOperaciones.Creacion.200", _exchangeConfig, queue)';
    const exampleLine3 = 'await _notificationsService.SendAsync(RoutingKeys.QueueErrors.GetDescription(), _exchangeConfig, queue);';
    console.log('Case1: Expected result: AutobusValidadorGuardar, Extracted Routing Key:', extractRoutekey(exampleLine),);
    console.log('Case2: Expected result: routingkey, Extracted Routing Key: ', extractRoutekey(exampleLine1));
    console.log('Case3: Expected result: "Catalogos.TipoOperaciones.Creacion.200", Extracted Routing Key:', extractRoutekey(exampleLine2));
    console.log('Case4: Expected result: "QueueErrors", Extracted Routing Key:', extractRoutekey(exampleLine3));
};

main();

//Test();