import config from '../../config';

// DOMUSTO
import DomustoPlugin from '../../domusto/DomustoPlugin';
import DomustoSignalHub from '../../domusto/DomustoSignalHub';
import DomustoDevice from '../../domusto/DomustoDevice';

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
            plugin: 'timer',
            author: 'Bas van Dijk',
            category: Domusto.PluginCategories.system,
            version: '0.0.1',
            website: 'http://domusto.com'
        });

        const suncCalcConstants = ['sunrise', 'sunriseEnd', 'goldenHourEnd', 'solarNoon', 'goldenHour', 'sunsetStart', 'sunset', 'dusk', 'nauticalDusk', 'night', 'nadir', 'nightEnd', 'nauticalDawn', 'dawn'];

        for (let d of config.devices) {

            let device = new DomustoDevice(d);

            // Initialise timers when specified
            if (device.pluginSettings.timer) {

                this.console.header('INITIALISING TIMERS for', device.id);

                for (let timer of device.pluginSettings.timer) {

                    if (!timer.enabled) {
                        this.console.warning(`    Timer (${timer.type})  disabled for ${device.id} state ${timer.state}`);
                    } else {

                        if (suncCalcConstants.indexOf(timer.time) > -1) {
                            this.scheduleSunTimer(device, timer);
                        } else {
                            this.scheduleCronTimer(device, timer);
                        }

                    }

                }

            }
        }

    }

    scheduleCronTimer(device, timer) {

        this.console.log('    Timer (time)  enabled  for', device.id, 'state', timer.state, 'at', timer.time);

        let job = schedule.scheduleJob(timer.time, () => {
            this.console.log('     Timer (time)  activated for', device.id, 'state', timer.state);

            this.broadcastSignal(device.plugin.deviceId, {
                state: timer.state
            }, Domusto.SignalSender.client, device.plugin.id);

        });

    }

    /**
     * Schedules a timer according to sunset, sunrise etc
     * @param {object} device The device who executes the command
     * @param {object} timer The timer object which contains the timer information
     */
    scheduleSunTimer(device, timer) {

        let _device = device;
        let _timer = timer;

        let times = SunCalc.getTimes(new Date(), config.location.latitude, config.location.longitude);
        let date = this._offsetDate(times[_timer.time], _timer.offset);

        // If the next event is tomorrow
        if (date < new Date()) {
            let today = new Date();
            let tomorrow = new Date(today.getTime() + (24 * 60 * 60 * 1000));
            times = SunCalc.getTimes(tomorrow, config.location.latitude, config.location.longitude);
            date = this._offsetDate(times[_timer.time], _timer.offset);
        }

        this.console.log('    Timer (sun)   enabled  for', _device.id, 'state', _timer.state, 'at', date, '/', new Date(date).toLocaleString());

        schedule.scheduleJob(date, () => {
            this.console.log('     Timer (sun)  activated for', _device.id, 'state', _timer.state);

            this.console.log(device.plugin.deviceId, {
                pluginId: device.plugin.id,
                state: timer.state
            });

            this.broadcastSignal(device.plugin.deviceId, {
                state: timer.state
            }, Domusto.SignalSender.client, device.plugin.id);


            // Reschedule for next day
            this.scheduleSunTimer(_device, _timer);
        });

    }

    // /**
    //  * Schedules a timer according to sunset, sunrise etc
    //  * @param {object} device The device who executes the command
    //  * @param {object} timer The timer object which contains the timer information
    //  */
    // initEventTimer(device, timer) {

    //     let _device = device;
    //     let _timer = timer;

    //     let date = this._offsetDate(new Date(), _timer.offset);

    //     schedule.scheduleJob(date, () => {
    //         this.console.log('   Timer (event) activated for', _device.id, 'state', _timer.state);
    //         // util.logTimersToFile('Timer (event) activated for ' + _device.id + ' state: ' + _timer.state);

    //         this.broadcastSignal(device.plugin.deviceId, {
    //             state: timer.state
    //         }, Domusto.SignalSender.client, device.plugin.id);

    //     });

    // }

    /**
 * Offsets the given date with the specified offset in cron format
 * @param {string} cronData Date in the cron format e.g "* 10 * * * *" to offset 10 minutes
 */
    _offsetDate(date, cronDateOffset) {

        if (cronDateOffset) {

            let cronDateSplitted = cronDateOffset.split(' ');

            if (cronDateSplitted.length !== 6) {
                console.error('invalid cron formatted date pattern');
            }

            let secondsOffset = parseInt(cronDateSplitted[0]) || 0;
            date.setSeconds(date.getSeconds() + secondsOffset);

            let minuteOffset = parseInt(cronDateSplitted[1]) || 0;
            date.setMinutes(date.getMinutes() + minuteOffset);

            let hourOffset = parseInt(cronDateSplitted[2]) || 0;
            date.setHours(date.getHours() + hourOffset);

            let dayOffset = parseInt(cronDateSplitted[3]) || 0;
            date.setDate(date.getDate() + dayOffset);

            let monthOffset = parseInt(cronDateSplitted[4]) || 0;
            date.setMonth(date.getMonth() + monthOffset);

            let yearOffset = parseInt(cronDateSplitted[5]) || 0;
            date.setFullYear(date.getFullYear() + yearOffset);
        }

        return date;

    }

}

export default DomustoTimer;