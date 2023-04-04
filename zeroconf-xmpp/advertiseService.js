import dnssd from 'dnssd';

// Advertise XMPP service using Bonjour/Zeroconf
const advertiseService = ({port, advertisedName, displayName}) => {
    const service = new dnssd.Advertisement(dnssd.tcp('presence'), port, {
        name: advertisedName, // the service name
        txt: { "1st": displayName }, // the display name
    });

    service.start();
    console.log(`Advertising XMPP service on port ${port}`);
    return service;
};

export default advertiseService;