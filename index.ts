import config from '../../config';

// DOMUSTO
import DomustoPlugin from '../../domusto/DomustoPlugin';
import DomustoSignalHub from '../../domusto/DomustoSignalHub';
import DomustoDevice from '../../domusto/DomustoDevice';

// INTERFACES
import { Domusto } from '../../domusto/DomustoTypes';

// PLUGIN SPECIFIC
import * as SunCalc from 'suncalc';
import * as cronParser from 'cron-parser';


interface Timer {
    name: string;
    time: number;
    task: Function;
}

/**
 * Timers plugin for DOMUSTO Home Automation
 * @author Bas van Dijk
 * @version 0.0.1
 *
 * @class DomustoTimers
 * @extends {DomustoPlugin}
 */
class DomustoTimer extends DomustoPlugin {

    timers: Array<Timer> = [];

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

        const sunCalcConstants = ['sunrise', 'sunriseEnd', 'goldenHourEnd', 'solarNoon', 'goldenHour', 'sunsetStart', 'sunset', 'dusk', 'nauticalDusk', 'night', 'nadir', 'nightEnd', 'nauticalDawn', 'dawn'];
        const deviceEvents = ['on', 'off', 'trigger'];

        for (let d of config.devices) {

            let device = new DomustoDevice(d);

            // Initialise timers when specified
            if (device.pluginSettings.timer) {

                this.console.header(`INITIALISING TIMERS for ${device.id} (${device.name})`);

                for (let timer of device.pluginSettings.timer) {

                    let isConfigurationValid = this.validateConfigurationAttributes(timer, [
                        {
                            attribute: 'enabled',
                            type: 'boolean'
                        },
                        {
                            attribute: 'time',
                            type: 'string'
                        },
                        {
                            attribute: 'state',
                            type: 'string',
                            validValues: ['on', 'off', 'trigger']
                        },
                    ]);

                    if (!isConfigurationValid) {
                        break;
                    }

                    if (!timer.enabled) {
                        this.console.warning(`    Timer (${timer.type})  disabled for ${device.id} state ${timer.state}`);
                    } else {

                        if (sunCalcConstants.indexOf(timer.time) > -1) {
                            this.scheduleSunTimer(device, timer);
                        } else if (deviceEvents.indexOf(timer.time) > -1) {
                            this.scheduleEventTimer(device, timer);
                        } else {
                            this.scheduleCronTimer(device, timer);
                        }

                    }

                }

            }
        }

        setInterval(() => this._checkExpiredTimers(), pluginConfiguration.settings && pluginConfiguration.settings.interval || 60000);
        this._checkExpiredTimers();

        this.console.header(`${pluginConfiguration.id} plugin ready`);

    }

    /**
     * Schdules a timer for timers set in cron format
     *
     * @param {any} device Device to set timer for
     * @param {any} timer Timer to set
     * @memberof DomustoTimer
     */
    scheduleCronTimer(device, timer) {

        this.console.log('    Timer (time)  enabled  for', device.id, 'state', timer.state, 'at', timer.time);

        // let job = schedule.scheduleJob(timer.time, () => {
        //     this.console.log('     Timer (time)  activated for', device.id, 'state', timer.state);

        //     this.broadcastSignal(device.plugin.deviceId, {
        //         state: timer.state
        //     }, Domusto.SignalSender.client, device.plugin.id);

        // });

        const _device = device;
        const _timer = timer;
        const _name = `(time) ${device.id} state ${timer.state}`;

        const parsedTime = cronParser.parseExpression(_timer.time);
        const date = parsedTime.next();

        let job = () => {
            this.console.log('     Timer (time)  activated for', device.id, 'state', timer.state);

            this.broadcastSignal(device.plugin.deviceId, {
                state: timer.state
            }, Domusto.SignalSender.client, device.plugin.id);

            const parsedTime = cronParser.parseExpression(_timer.time);
            const date = parsedTime.next();

            this._addTimer({
                time: date.toDate().valueOf(),
                task: job,
                name: _name
            });

        };

        this._addTimer({
            time: date.toDate().valueOf(),
            task: job,
            name: _name
        });

    }

    getSunTime(timer) {
        let times = SunCalc.getTimes(new Date(), config.location.latitude, config.location.longitude);
        let date = this._offsetDate(times[timer.time], timer.offset);

        // If the next event is tomorrow
        if (date < new Date()) {
            let today = new Date();
            let tomorrow = new Date(today.getTime() + (24 * 60 * 60 * 1000));
            times = SunCalc.getTimes(tomorrow, config.location.latitude, config.location.longitude);
            date = this._offsetDate(times[timer.time], timer.offset);
        }

        return date;
    }

    /**
     * Schedules a timer according to sunset, sunrise etc
     *
     * @param {any} device Device to set timer for
     * @param {any} timer Timer to set
     * @memberof DomustoTimer
     */
    scheduleSunTimer(device, timer) {

        const _device = device;
        const _timer = timer;
        const _name = `(sun) ${device.id} state ${timer.state}`;

        const date = this.getSunTime(_timer);

        this.logToFileAndConsole('    Timer (sun)   enabled  for', _device.id, 'state', _timer.state, 'at', date, '/', new Date(date).toLocaleString());

        const job = () => {
            this.logToFileAndConsole('     Timer (sun)  activated for', _device.id, 'state', _timer.state);

            const newDate = this.getSunTime(timer);
            this.logToFileAndConsole('     Timer (sun)  rescheduled for', _device.id, 'state', _timer.state);

            this.console.log(device.plugin.deviceId, {
                pluginId: device.plugin.id,
                state: timer.state
            });

            this.broadcastSignal(device.plugin.deviceId, {
                state: timer.state
            }, Domusto.SignalSender.client, device.plugin.id);

            const date = this.getSunTime(_timer);

            this._addTimer({
                time: date.valueOf(),
                task: job,
                name: _name
            });

            // Reschedule for next day
            // this.scheduleSunTimer(_device, _timer);
        };

        this._addTimer({
            time: date.valueOf(),
            task: job,
            name: _name
        });

    }

    /**
     * Schedules a timer according to sunset, sunrise etc
     * @param {object} device The device who executes the command
     * @param {object} timer The timer object which contains the timer information
     */
    scheduleEventTimer(device, timer) {

        const _device = device;
        const _timer = timer;
        const _name = `(offset) ${device.id} state ${timer.state}`;

        DomustoSignalHub.subject.subscribe((signal: Domusto.Signal) => {

            if (signal.pluginId === device.plugin.id &&
                signal.deviceId === device.plugin.deviceId &&
                signal.data['state'] === timer.time &&
                signal.sender === Domusto.SignalSender.plugin) {

                const date = this._offsetDate(new Date(), _timer.offset);

                const job = () => {
                    this.console.log('   Timer (offset) activated for', _device.id, 'state', _timer.state);

                    this.broadcastSignal(device.plugin.deviceId, {
                        state: timer.state
                    }, Domusto.SignalSender.client, device.plugin.id);

                };

                this._addTimer({
                    time: date.valueOf(),
                    task: job,
                    name: _name
                });


            }

        });


    }

    /**
     * Offsets the given date with the specified offset in cron format
     * @param {string} cronData Date in the cron format e.g "+ * 10 * * * *" to offset 10 minutes
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

    private _addTimer(timer: Timer) {

        if (typeof timer.time !== 'number') {
            this.console.error('Timer time should be number. Use Date.valueOf() to get the date as number');
            return;
        }

        if (typeof timer.task !== 'function') {
            this.console.error('Timer task is not a function');
            return;
        }

        this.timers.push(timer);

    }

    private _checkExpiredTimers() {

        const currentTime = Date.now();

        for (let i = this.timers.length - 1; i >= 0; i--) {
            let timer: Timer = this.timers[i];

            const { d, h, m, s } = this._timeToString(timer.time - currentTime);

            this.console.log(i, timer.name, new Date(timer.time), `${d}d ${h}h ${m}m ${s}s`);

            if (timer.time < currentTime && typeof timer.task === 'function') {
                timer.task();
                this.timers.splice(0, 1);
            }
        }
    }

    private _timeToString(time) {
        let d, h, m, s;
        s = Math.floor(time / 1000);
        m = Math.floor(s / 60);
        s = s % 60;
        h = Math.floor(m / 60);
        m = m % 60;
        d = Math.floor(h / 24);
        h = h % 24;
        h += d * 24;

        return {
            d,
            h,
            m,
            s,
          };
    }

}

export default DomustoTimer;