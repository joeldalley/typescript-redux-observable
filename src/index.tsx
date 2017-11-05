import * as React from 'react'
import * as ReactDOM from 'react-dom'
import * as ReactRedux from 'react-redux'
import * as Redux from 'redux'
import * as ReduxObservable from 'redux-observable'
import * as Rx from 'rxjs'

import getOrElse from './getOrElse'

///////////////////////////////////////////////////////////////
// Models

namespace Model {
  export interface Temperature {
    celsius: number
    fahrenheit: number
  }

  export type Direction = 'N' | 'E' | 'S' | 'W'

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

  export type Constructable = WeatherState & {json: object | null}

  export const cardinalPoints = ['N', 'E', 'S', 'W']
  export const getWindDirection = (maybeDir = ''): Direction =>
    cardinalPoints.includes(maybeDir) ? maybeDir as Direction : 'N'

  export class WeatherState implements WeatherState {
    error = ''
    temperature: Temperature = {celsius: 0, fahrenheit: 0}
    wind: Wind = {description: 'calm', direction: 'N', speed: {'mi/h': 0}}

    constructor(arg: Partial<Constructable> = {json: null}) {
      if (arg.json) {
        this.temperature = {
          celsius: Number(getOrElse(arg.json, ['c', 'temp.celsius'], 0)),
          fahrenheit: Number(getOrElse(arg.json, ['f', 'temp.fahrenheit'], 0))
        }
        this.wind = {
          ...this.wind,
          direction: getWindDirection(getOrElse(arg.json, 'wind.direction')),
          speed: {'mi/h': Number(getOrElse(arg.json, 'wind.speed', 0))}
        }
      }
      else {
        this.error = String(arg.error || '') as string
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
// Action types and Action creator functions

namespace Action {
  export type Error = Redux.AnyAction & {error: string}
  export type Fetched = Redux.AnyAction & {json: object}

  export function error(err: string): Error {
    return {type: 'ERROR', error: err}
  }

  export function fetch(): Redux.Action {
    return {type: 'FETCH'}
  }

  export function fetched(json: any): Fetched {
    return {type: 'FETCHED', json: Object(json)}
  }
}

///////////////////////////////////////////////////////////////
// Reducers

namespace Reducer {
  export function weather(
    state: Model.WeatherState = new Model.WeatherState(),
    action: Redux.AnyAction = {type: '__EMPTY_OPERATION__'}
  ): Model.WeatherState {
    switch (action.type) {
      case 'ERROR': return new Model.WeatherState({
        ...state,
        error: String(action.error),
        json: null
      })
      case 'FETCH': return new Model.WeatherState({
        ...state,
        error: '',
        json: null
      })
      case 'FETCHED': return new Model.WeatherState({
        ...state,
        error: '',
        json: action.json,
      })
      default: return state
    }
  }
}

///////////////////////////////////////////////////////////////
// Epics

namespace Epic {
  const emptyOr = (or: object) => Math.random() < .5 ? {} : or

  export function fetchWeather(action$: any) {
    return action$
      .ofType('FETCH')
      .switchMap((_: Redux.AnyAction) => {
        if (Math.random() < .2) {
          return Rx.Observable.of(
            Action.error('Random Error! ' + Math.random())
          )
        }
        else {
          return Rx.Observable.of(
            Action.fetched({
              ...emptyOr({c: Math.random() * 10}),
              ...emptyOr({f: Math.random() * 50}),
              temp: {
                ...emptyOr({celsius: Math.random() * 10}),
                ...emptyOr({fahrenheit: Math.random() * 50})
              },
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
    dispatch: Redux.Dispatch<any>
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
      const {celsius: c, fahrenheit: f} = this.props.weather.temperature
      return (
        <div className='alert alert-success' role='alert'>
          <h4 className='alert-heading'>Temperature</h4>
          <p>{f}&deg; F</p>
          <hr/>
          <p className='mb-0'>{c}&deg; C</p>
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

  const map: ReactRedux.MapStateToProps<Props, Props> = state => state
  export const WeatherStation = ReactRedux.connect(map)(WeatherStationCore)
}

///////////////////////////////////////////////////////////////
// Wire up Redux store and mount the app to the DOM.

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
      <Component.WeatherStation
        dispatch={store.dispatch}
        weather={new Model.WeatherState()}/>
    </ReactRedux.Provider>,
    document.getElementById('app')
  )
}

launchApp()
