import config from '../../config';

// DOMUSTO
import DomustoPlugin from '../../domusto/DomustoPlugin';
import DomustoSignalHub from '../../domusto/DomustoSignalHub';
import DomustoDevicesManager from '../../domusto/DomustoDevicesManager';

// INTERFACES
import { Domusto } from '../../domusto/DomustoInterfaces';

// PLUGIN SPECIFIC
import * as SunCalc from 'suncalc';
import * as schedule from 'node-schedule';

/**
 * Timers plugin for DOMUSTO Home Automation
 * @author Bas van Dijk
 * @version 0.0.1
 *
 * @class DomustoTimers
 * @extends {DomustoPlugin}
 */
class DomustoTimer extends DomustoPlugin {

    /**
     * Creates an instance of Domusto timer.
     * @param {any} Plugin configuration as defined in the config.js file
     * @memberof DomustoTimers
     */
    constructor(pluginConfiguration: Domusto.PluginConfiguration) {

        super({
            plugin: 'timers',
            author: 'Bas van Dijk',
            category: Domusto.PluginCategories.system,
            version: '0.0.1',
            website: 'http://domusto.com'
        });

        DomustoDevicesManager.getDevicesByRole(Domusto.DeviceRole.output);

    }

    onSignalReceivedForPlugin(signal: Domusto.Signal) {

    }

}

export default DomustoTimer;