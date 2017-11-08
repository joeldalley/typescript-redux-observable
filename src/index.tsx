import * as React from 'react'
import * as ReactDOM from 'react-dom'
import * as ReactRedux from 'react-redux'
import * as Redux from 'redux'
import * as ReduxObservable from 'redux-observable'
import * as Rx from 'rxjs'

import {getNumberOr, getStringOr} from './getOrElse'

///////////////////////////////////////////////////////////////
// Models

namespace Model {
  export interface Temperature {
    celsius: number
    fahrenheit: number
  }

  export enum Direction {N = 'N', E = 'E', S = 'S', W = 'W'}

  export interface Wind {
    description: 'calm' | 'windy' | 'very windy'
    direction: Direction
    speed: {'mi/h': number}
  }

  export interface WeatherState {
    error: string
    temperature: Temperature
    wind: Wind
  }

  export type Constructable = WeatherState & {json?: object}

  export const cardinalPoints = Object.keys(Direction)
  export const getWindDirection = (dir = ''): Direction => {
    return cardinalPoints.includes(String(dir)) ? dir as Direction : Direction.N
  }

  export class WeatherState implements WeatherState {
    error = ''
    temperature: Temperature = {celsius: 0, fahrenheit: 0}
    wind: Wind = {description: 'calm', direction: Direction.N, speed: {'mi/h': 0}}

    constructor(arg: Partial<Constructable> = {}) {
      if (arg.json) {
        this.temperature = {
          celsius: getNumberOr(arg.json, ['c', 'temp.celsius'], 0),
          fahrenheit: getNumberOr(arg.json, ['f', 'temp.fahrenheit'], 0)
        }
        this.wind = {
          ...this.wind,
          direction: getWindDirection(getStringOr(arg.json, 'wind.direction')),
          speed: {'mi/h': getNumberOr(arg.json, 'wind.speed', 0)}
        }
      }
      else {
        this.error = arg.error || this.error
        this.temperature = arg.temperature || this.temperature
        this.wind = arg.wind || this.wind
      }

      this.wind.description = this.wind.speed['mi/h'] < 20 && 'calm'
                           || this.wind.speed['mi/h'] < 40 && 'windy'
                           || 'very windy'
    }
  }
}

///////////////////////////////////////////////////////////////
// Action types and action creator functions

namespace Action {
  export const Types = {
    ERROR:   'WeatherState/ERROR',
    FETCH:   'WeatherState/FETCH',
    FETCHED: 'WeatherState/FETCHED'
  }

  export type WeatherAction = {
    type: string
    error?: string
    json?: object
  }

  export const DO_NOTHING: WeatherAction = {type: 'DO_NOTHING'}

  export function error(err: string): WeatherAction {
    return {type: Types.ERROR, error: err}
  }

  export function fetch(): WeatherAction {
    return {type: Types.FETCH}
  }

  export function fetched(json: object): WeatherAction {
    return {type: Types.FETCHED, json}
  }
}

///////////////////////////////////////////////////////////////
// Reducers

namespace Reducer {
  export function weather(
    state: Model.WeatherState = new Model.WeatherState(),
    action: Action.WeatherAction = Action.DO_NOTHING
  ): Model.WeatherState {
    switch (action.type) {
      case Action.Types.ERROR: return new Model.WeatherState({
        ...state,
        error: action.error
      })
      case Action.Types.FETCH: return new Model.WeatherState({
        ...state,
        error: ''
      })
      case Action.Types.FETCHED: return new Model.WeatherState({
        ...state,
        error: '',
        json: action.json
      })
      default: return state
    }
  }
}

///////////////////////////////////////////////////////////////
// Epics

namespace Epic {
  const emptyOr = (or: object) => Math.random() < .5 ? {} : or

  export function fetchWeather(
    action$: ReduxObservable.ActionsObservable<Action.WeatherAction>
  ) {
    return action$
      .ofType(Action.Types.FETCH)
      .switchMap(() => {
        if (Math.random() < .2) {
          return Rx.Observable.of(
            Action.error('Error: Something went wrong.')
          )
        }
        else {
          return Rx.Observable.of(
            Action.fetched({
              ...emptyOr({c: Math.random() * 10}),
              ...emptyOr({f: Math.random() * 50}),
              temp: emptyOr({
                ...emptyOr({celsius: Math.random() * 10}),
                ...emptyOr({fahrenheit: Math.random() * 50})
              }),
              wind: {
                ...emptyOr({speed: Math.random() * 60}),
                direction: Model.cardinalPoints[Math.floor(Math.random() * 4)]
              }
            })
          )
        }
      })
  }
}

///////////////////////////////////////////////////////////////
// Components

namespace Component {
  interface Props {
    dispatch: Redux.Dispatch<Action.WeatherAction>
    weather: Model.WeatherState
  }

  class WeatherStationCore extends React.Component<Props> {
    componentWillMount() {
      setInterval(() => this.props.dispatch(Action.fetch()), 1000)
    }

    renderError() {
      const {error} = this.props.weather
      const className = error ? 'alert alert-danger' : ''
      const role = error ? 'alert' : ''
      return <div className={className} role={role}>{error}</div>
    }

    renderTemperature() {
      const {celsius, fahrenheit} = this.props.weather.temperature
      return (
        <div className='alert alert-success' role='alert'>
          <h4 className='alert-heading'>Temperature</h4>
          <p>{fahrenheit}&deg; F</p>
          <hr/>
          <p className='mb-0'>{celsius}&deg; C</p>
        </div>
      )
    }

    renderWind() {
      const {description, direction, speed} = this.props.weather.wind
      return (
        <div className='alert alert-primary' role='alert'>
          <h4 className='alert-heading'>Wind ({description})</h4>
          <p>Speed: {speed['mi/h']} mi/h</p>
          <hr/>
          <p className='mb-0'>Direction: {direction}</p>
        </div>
      )
    }

    render() {
      return (
        <div>
          <h1>Weather</h1>
          {this.renderTemperature()}
          {this.renderWind()}
          {this.renderError()}
        </div>
      )
    }
  }

  const map: ReactRedux.MapStateToProps<Props, {}> = state => state
  export const WeatherStation = ReactRedux.connect(map)(WeatherStationCore)
}

///////////////////////////////////////////////////////////////
// Wire up Redux store and mount the app to the DOM

export function launchApp() {
  const store = Redux.createStore(
    Redux.combineReducers({
      weather: Reducer.weather
    }),
    Redux.applyMiddleware(
      ReduxObservable.createEpicMiddleware(
        ReduxObservable.combineEpics(
          Epic.fetchWeather
        )
      )
    )
  )

  ReactDOM.render(
    <ReactRedux.Provider store={store}>
      <Component.WeatherStation/>
    </ReactRedux.Provider>,
    document.getElementById('app')
  )
}

launchApp()
