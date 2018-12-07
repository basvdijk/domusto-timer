# DOMUSTO Timer plugin

```
plugin:       Timer
author:       Bas van Dijk
category:     system
version:      0.0.1
website:      http://domusto.com
description:  Fire events based on time events
```

## Features
- [x] Fire event on specific time
- [x] Fire event on sun event e.g. sunrise / sunset
- [x] Fire event n seconds after a switch turned on / off
- [X] Set an offset to the specified time
- [ ] Fire event with a random time offset within specified boundaries

## Hardware needed
- none

## Tested with
- n/a

Timers switch on or off at a certain time. There are three types of timers:
- `Time` is time related and uses cron notation
- `Sun` is sun related e.g. sunset, sunrise etc. 
- `Event` sets a timer based on an event like `on` or `off` and executes another action after a specified time.

## Installation

Execute in the domusto-server folder:
```sh
$ ./domusto.js plugin add basvdijk/domusto-timer
```

## Plugin configuration
```js
{
    id: 'TIMER',
    enabled: true,
    settings: {
        interval: 1000
    }
},
```

`Interval` (optional) is the time between the checks for expired timers which need to be activated

## Configuration
Timers are set in the `plugin-settings` section of each device. Since the plugin is called `timer` its settings are set under the `timer` section as shown in the example below:

```js
{
    id: 'KAKU1',
    enabled: true,
    role: 'output',
    name: 'switch 1',
    type: 'switch',
    subType: 'on/off',
    plugin: {
        id: 'RFXCOM',
        deviceId: 'Lighting2/AC-0x02340504/4',
    },
    pluginSettings: {

        timer: [
            {
                enabled: true,
                time: 'on',
                offset: '10 * * * * *',
                state: 'off',
            }
        ]
        
    }
}
```

On the bottom of this document you'll find more example configurations.

## Time timer

| Property | Type    | Description                                           |
|----------|---------|-------------------------------------------------------|
| enabled  | boolean | defines if timer is enabled                           |
| time     | string  | time cron pattern to fire timer                       |
| state    | string  | state to switch to when timer fires e.g. on, off etc. |

The cron format consists of:
```
*    *    *    *    *    *
┬    ┬    ┬    ┬    ┬    ┬
│    │    │    │    │    |
│    │    │    │    │    └ day of week (0 - 7) (0 or 7 is Sun)
│    │    │    │    └───── month (1 - 12)
│    │    │    └────────── day of month (1 - 31)
│    │    └─────────────── hour (0 - 23)
│    └──────────────────── minute (0 - 59)
└───────────────────────── second (0 - 59, OPTIONAL)
```

Source: https://github.com/node-schedule/node-schedule/blob/master/README.md

### Time timer example

**Switch off every day at 22:00h**
```js
{
    enabled: false,
    state: 'off',
    time: '0 0 22 * * *'     // (make sure you don't use * * 22 * * * instead. Otherwise it will be triggered every second)
},
```

## Sun timer

| Property  | Type    | Description                                            |
|-----------|---------|--------------------------------------------------------|
| enabled   | boolean | defines if timer is enabled                            |
| offset    | string  | time offset in: sec min hour day month year            |
| time      | string  | type of sun condition see table below e.g. "sunset"    |
| state     | string  | state to switch to after timer fires e.g. on, off etc. |


| Property      | Description                                                              |
|---------------|--------------------------------------------------------------------------|
| sunrise       | sunrise (top edge of the sun appears on the horizon)                     |
| sunriseEnd    | sunrise ends (bottom edge of the sun touches the horizon)                |
| goldenHourEnd | morning golden hour (soft light, best time for photography) ends         |
| solarNoon     | solar noon (sun is in the highest position)                              |
| goldenHour    | evening golden hour starts                                               |
| sunsetStart   | sunset starts (bottom edge of the sun touches the horizon)               |
| sunset        | sunset (sun disappears below the horizon, evening civil twilight starts) |
| dusk          | dusk (evening nautical twilight starts)                                  |
| nauticalDusk  | nautical dusk (evening astronomical twilight starts)                     |
| night         | night starts (dark enough for astronomical observations)                 |
| nadir         | nadir (darkest moment of the night, sun is in the lowest position)       |
| nightEnd      | night ends (morning astronomical twilight starts)                        |
| nauticalDawn  | nautical dawn (morning nautical twilight starts)                         |
| dawn          | dawn (morning nautical twilight ends, morning civil twilight starts)     |

Source: https://raw.githubusercontent.com/mourner/suncalc/master/README.md

### Sun timer example

**Switch on every day two hours before sunset**
```js
{
    enabled: true,
    time: 'sunset',
    state: 'on',
    offset: '* * -2 * * *'
}
```

## Event timer

| Property | Type    | Description                                            |     |         |
|----------|---------|--------------------------------------------------------|-----|---------|
| enabled  | boolean | defines if timer is enabled                            |     |         |
| type     | string  | type of timer: "event"                                 |     |         |
| offset   | string  | time offset in: sec min hour day month year            |     |         |
| time     | string  | event to listen to on                                  | off | trigger |
| state    | string  | state to switch to after timer fires e.g. on, off etc. |     |         |

### Event timer Example

Emits a signal after a given time.

**Switch device off, 5 minutes after it was turned on**
```js
{
    enabled: true,
    offset: '* 5 * * * *',
    time: 'on',
    state: 'off',
},
```


## Example scenario 1

- We want the lights to turn on at sunset every day.
- During the normal days we want to turn off the lights at 23:00h. 
- On Friday and Saturday we are going to sleep late around 0:30h, therefore we want to have the garden lights to be turned off later. 

One thing is very important to note here. The mentioned 0:30h is actually already in the next day. So to turn off our lights correctly we have to turn them off late on *Saturday and Sunday morning*.

At first sight the timers defined below look weird, Sunday is defined twice and Monday is missing. Actually this is correct. On Sunday morning at 0:30h the light goes off which we switched on after sunset on Saturday evening. However on this same Sunday the go on at sunset and off on 23:00h.

```js

// Switch on every day at sunset
{
    enabled: true,
    time: 'sunset',
    state: 'on'
},

// Switch off Sunday till Thursday at 23:00h
{
    enabled: true,
    time: '0 0 23 * * SUN-THU',
    state: 'off'
},

// Switch off Saturday till Sunday at 0:30h
{
    enabled: true,
    time: '0 30 0 * * SAT-SUN',
    state: 'off'
}
```

## Example configurations


**Switch off 10 minutes after turning on**
```js
{
    enabled: true,
    time: 'on',
    offset: '* 10 * * * *',
    state: 'off',
}
```

**Switch off every day at 22:00h**
```js
{
    enabled: false,
    state: 'off',
    time: '0 0 22 * * *'     // (make sure you don't use * * 22 * * * instead. Otherwise it will be triggered every second)
},
```

**Switch on every day 1h _before_ sunset**
```js
{
    enabled: true,
    state: 'on',
    time: 'sunset',
    offset: '* * -1 * * *',  // One hour before sunset
},
```

**Switch off 2h after sunrise**
```js
{
    enabled: true,
    state: 'off',
    time: 'sunrise',
    offset: '* * 2 * * *',
},
```

**Switch on every day on sunset**
```js
{
    enabled: true,
    time: 'sunset',
    state: 'on'
},
```

**Switch off every Sunday till Thursday at 23:00h**
```js
{
    enabled: true,
    time: '0 0 23 * * SUN-THU',
    state: 'off'
},
```

**Switch off every Saturday and Sunday at 0:30h**
```js
{
    enabled: true,
    time: '0 30 0 * * SAT-SUN',
    state: 'off'
},
```
