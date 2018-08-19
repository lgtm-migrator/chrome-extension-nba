import types from './types'
import moment from 'moment-timezone'

const initState = {
    isLoading: false,
    games: [],
}

const sanitizeGame = game => ({
    id: game.id,
    date: game.date,
    time: game.time,
    state: game.state,
    arena: {
        name: game.arena,
        city: game.city,
    },
    broadcasters: game.broadcasters,
    home: game.home,
    visitor: game.visitor,
    playoffs: game.playoffs,
    periodTime: {
        // have not start
        periodStatus: game.period_time.game_status === '1'
            ? moment.tz(`${game.date}${game.time}`, 'YYYYMMDDhhmm', 'America/New_York').local().format('hh:mm A')
            : game.period_time.period_status,
        gameClock: game.period_time.game_clock,
        gameStatus: game.period_time.game_status,
        periodValue: game.period_time.period_value,
    },
})

const sanitizeGames = games => {
    return games.map(game => sanitizeGame(game))
}

export default (state = initState, action) => {
    switch (action.type) {
        case types.REQUEST_START:
            return {
                ...state,
                isLoading: true,
            }
        case types.REQUEST_SUCCESS:
            return {
                ...state,
                isLoading: false,
                games: sanitizeGames(action.payload),
            }
        case types.REQUEST_ERROR:
            return {
                ...state,
                isLoading: false,
                games: [],
            }
        default:
            return state
    }
}