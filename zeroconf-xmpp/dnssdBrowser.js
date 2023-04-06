import dnssd from 'dnssd';

/**
 * This cache is to work around dnssd sometimes not returning the ipv4 ip address.
 */
const cache = {};
const browser = new dnssd.Browser(dnssd.tcp('presence'));

browser.on('serviceUp', (service) => {
    // Check if the service name matches the desired name
    // if (service.name === who && service.addresses.find((address) => address.match(/192\.168\./))) {
    const result = { url: service.addresses[0], port: service.port, to: service.name };
    console.log('found', result);
    cache[service.name] = result;
});

browser.on('serviceDown', (service) => {
    console.log('lost', service.name)
    delete cache[service.name];
});

browser.start();

export const getServiceByName = async (serviceName) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(cache[serviceName]);
        }, 1000);
    });
};

export const getAllServices = async () => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(Object.values(cache));
        }, 1000);
    });
};