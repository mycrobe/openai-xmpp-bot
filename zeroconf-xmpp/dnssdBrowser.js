import dnssd from 'dnssd';
import _ from 'lodash';

/**
 * This cache is to work around dnssd sometimes not returning the ipv4 ip address.
 */
const cache = {};
const browser = new dnssd.Browser(dnssd.tcp('presence'));
let servicesToIgnore = [];

browser.on('serviceUp', (service) => {
    // Check if the service name matches the desired name
    // if (service.name === who && service.addresses.find((address) => address.match(/192\.168\./))) {
    const result = { url: service.addresses[0], port: service.port, to: service.name };
    const isOnIgnoreList = servicesToIgnore.includes(service.name);
    console.log('found', result, 'are we going to ignore it?', isOnIgnoreList);
    cache[service.name] = result;
});

browser.on('serviceDown', (service) => {
    console.log('lost', service.name)
    delete cache[service.name];
});

browser.start();

export const setIgnoreList = (ignoreList) => {
    servicesToIgnore = ignoreList;

    // this is just to log the services we are ignoring
    const servicesWeAreIgnoring = _.filter(cache, (service) => servicesToIgnore.includes(service.to));
    if (servicesWeAreIgnoring.length) {
        console.log(`Ignoring services: ${servicesWeAreIgnoring.map((service) => service.to).join(', ')}`);
    }
};

export const getServiceByName = async (serviceName) => {
    if (servicesToIgnore.includes(serviceName)) {
        throw new Error(`Service ${serviceName} is on the ignore list`);
    }

    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(cache[serviceName]);
        }, 1000);
    });
};

export const getAllServices = async () => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const filteredCache = _.filter(cache, (service) => !servicesToIgnore.includes(service.to));
            resolve(Object.values(filteredCache));
        }, 1000);
    });
};