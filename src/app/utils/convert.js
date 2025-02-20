import { utcToZonedTime } from 'date-fns-tz'
import parse from 'date-fns/parse'
import format from 'date-fns/format'
import isValid from 'date-fns/isValid'
import { getUserTimeZoneId } from './time'
import { toPercentage } from './common'
import { QUARTER_NAMES } from './constant'
import { getNickNamesByTriCode } from '../utils/teams'
import getApiDate from './getApiDate'

const getStats = (old, points) => {
  if (!old) {
    return {}
  }
  return {
    assists: old.ast,
    blocks: old.blk,
    field_goals_attempted: old.fga,
    field_goals_made: old.fgm,
    field_goals_percentage: toPercentage(+old.fgm / +old.fga),
    fouls: old.pf,
    free_throws_attempted: old.fta,
    free_throws_made: old.ftm,
    free_throws_percentage: toPercentage(+old.ftm / +old.fta),
    points,
    rebounds_defensive: old.dreb,
    rebounds_offensive: old.oreb,
    steals: old.stl,
    team_fouls: old.tf,
    team_rebounds: old.tmreb,
    team_turnovers: old.tmtov,
    three_pointers_attempted: old.tpa,
    three_pointers_made: old.tpm,
    three_pointers_percentage: toPercentage(+old.tpm / +old.tpa),
    turnovers: old.tov,
  }
}

const getPlayers = (players = []) => {
  return players.map((player) => ({
    assists: player.ast,
    blocks: player.blk,
    field_goals_attempted: player.fga,
    field_goals_made: player.fgm,
    first_name: player.fn,
    fouls: player.pf,
    free_throws_attempted: player.fta,
    free_throws_made: player.ftm,
    last_name: player.ln,
    minutes: player.min,
    on_court: player.court,
    person_id: player.pid,
    plus_minus: player.pm,
    points: player.pts,
    rebounds_defensive: player.dreb,
    rebounds_offensive: player.oreb,
    seconds: player.sec,
    starting_position: player.pos,
    steals: player.stl,
    three_pointers_attempted: player.tpa,
    three_pointers_made: player.tpm,
    turnovers: player.tov,
  }))
}

const getLinescores = (stats, p) => {
  const pluck = ({
    q1,
    q2,
    q3,
    q4,
    ot1,
    ot2,
    ot3,
    ot4,
    ot5,
    ot6,
    ot7,
    ot8,
    ot9,
    ot10,
  }) => [q1, q2, q3, q4, ot1, ot2, ot3, ot4, ot5, ot6, ot7, ot8, ot9, ot10]
  return pluck(stats)
    .slice(0, p)
    .map((period, i) => ({
      period_name: QUARTER_NAMES[i],
      period_value: i.toString(),
      score: period.toString(),
    }))
}

const addQuarterNames = (linescores) =>
  linescores.map((ls, i) => ({
    period_name: QUARTER_NAMES[i],
    period_value: i.toString(),
    score: ls.score,
  }))

const getBroadcasters = (watch) => {
  try {
    const {
      broadcast: {
        broadcasters: { national, vTeam, hTeam },
      },
    } = watch
    return [
      ...national.map((c) => ({ scope: 'natl', display_name: c.shortName })),
      ...vTeam.map((c) => ({ scope: 'local', display_name: c.shortName })),
      ...hTeam.map((c) => ({ scope: 'local', display_name: c.shortName })),
    ]
  } catch (e) {
    return []
  }
}

const getPlayoffs = (playoffs) => {
  if (playoffs == null || playoffs.hTeam == null || playoffs.vTeam == null) {
    return undefined
  }

  return {
    home_wins: playoffs.hTeam.seriesWin,
    visitor_wins: playoffs.vTeam.seriesWin,
  }
}

// for cdn
export const convertDaily3 = (game) => {
  const {
    gameTimeUTC,
    gameStatus,
    gameStatusText,
    period,
    homeTeam: h,
    awayTeam: v,
    // from 2
    watch,
    playoffs,
  } = game

  const formatGameStatus = () => {
    if (gameStatus === 1) {
      return format(utcToZonedTime(gameTimeUTC, getUserTimeZoneId()), 'hh:mm a')
    }

    if (gameStatusText === 'Half') {
      return 'Halftime'
    }

    return gameStatusText
  }

  const addQuarterNames = (linescores) =>
    linescores.map((ls, i) => ({
      period_name: QUARTER_NAMES[i],
      period_value: i.toString(),
      score: ls.score,
    }))

  return {
    broadcasters: getBroadcasters(watch),
    home: {
      abbreviation: h.teamTricode,
      city: h.teamCity,
      linescores: { period: addQuarterNames(h.periods) },
      nickname: getNickNamesByTriCode(h.teamTricode),
      score: `${h.score}`,
    },
    visitor: {
      abbreviation: v.teamTricode,
      city: v.teamCity,
      linescores: { period: addQuarterNames(v.periods) },
      nickname: getNickNamesByTriCode(v.teamTricode),
      score: `${v.score}`,
    },
    periodTime: {
      periodStatus: formatGameStatus(),
      gameClock: gameStatusText,
      gameStatus: `${gameStatus}`,
      periodValue: `${period}`,
    },
    playoffs: getPlayoffs(playoffs),
  }
}

// this is for http://data.nba.net/prod/v2/dateStr/scoreboard.json endpoint
export const convertDaily2 = (game) => {
  const {
    startTimeUTC,
    endTimeUTC,
    statusNum,
    extendedStatusNum,
    clock,
    hTeam: h,
    vTeam: v,
    period: { current: p, isHalftime, isEndOfPeriod },
    watch,
    playoffs,
    nugget,
  } = game

  const formatGameStatus = () => {
    // special case for postponed games
    if (
      nugget != null &&
      nugget.text != null &&
      typeof nugget.text === 'string' &&
      nugget.text.toLowerCase().trim() === 'postponed'
    ) {
      return 'PPD'
    }
    if (extendedStatusNum != null && extendedStatusNum === 2) {
      return 'PPD'
    }
    if (endTimeUTC != null) {
      return 'Final'
    } else if (isHalftime) {
      return 'Halftime'
    } else if (statusNum === 1) {
      return format(
        utcToZonedTime(startTimeUTC, getUserTimeZoneId()),
        'hh:mm a'
      )
    } else if (isEndOfPeriod) {
      if (p > 4) {
        const otP = p - 4
        return `End of ${otP} OT`
      }
      return `End of ${p} Qtr`
    } else {
      // normal period
      if (p > 4) {
        const otP = p - 4
        return `${otP} OT`
      }
      return `${p} Qtr`
    }
  }

  return {
    broadcasters: getBroadcasters(watch),
    home: {
      abbreviation: h.triCode,
      city: '',
      linescores: { period: addQuarterNames(h.linescore) },
      nickname: getNickNamesByTriCode(h.triCode),
      score: h.score,
    },
    visitor: {
      abbreviation: v.triCode,
      city: '',
      linescores: { period: addQuarterNames(h.linescore) },
      nickname: getNickNamesByTriCode(v.triCode),
      score: v.score,
    },
    periodTime: {
      // have not start
      periodStatus: formatGameStatus(),
      gameClock: clock,
      gameStatus: `${statusNum}`,
      periodValue: `${p}`,
    },
    playoffs: getPlayoffs(playoffs),
  }
}

export const convertDaily = (game) => {
  const { cl, h, p, st, stt, v } = game

  const gameTime = parse(stt, 'hh:mm a', getApiDate())
  const isStatusValidDate = isValid(gameTime)
  return {
    periodTime: {
      periodValue: `${p}`,
      periodStatus:
        st == 1 && isStatusValidDate
          ? format(
              utcToZonedTime(gameTime.toISOString(), getUserTimeZoneId()),
              'hh:mm a'
            )
          : stt,
      gameClock: cl || '',
      gameStatus: `${st}`,
    },
    home: {
      abbreviation: h.ta,
      city: h.tc,
      linescores: { period: getLinescores(h, p) },
      nickname: h.tn,
      score: `${h.s}`,
    },
    visitor: {
      abbreviation: v.ta,
      city: v.tc,
      linescores: { period: getLinescores(v, p) },
      nickname: v.tn,
      score: `${v.s}`,
    },
  }
}

export const convertBS = (old) => {
  const { cl, hls, offs, p, st, stt, vls } = old
  let officials = []
  if (offs && offs.off) {
    officials = offs.off.map((person) => ({
      first_name: person.fn,
      last_name: person.ln,
      person_id: person.num,
    }))
  }

  return {
    officials,
    periodTime: {
      periodValue: `${p}`,
      periodStatus: `${stt}`,
      gameClock: cl,
      gameStatus: `${st}`,
    },
    home: {
      abbreviation: hls.ta,
      city: hls.tc,
      linescores: { period: getLinescores(hls, p) },
      nickname: hls.tn,
      players: { player: getPlayers(hls.pstsg) },
      score: hls.s,
      stats: getStats(hls.tstsg, hls.s),
    },
    visitor: {
      abbreviation: vls.ta,
      city: vls.tc,
      linescores: { period: getLinescores(vls, p) },
      nickname: vls.tn,
      players: { player: getPlayers(vls.pstsg) },
      score: vls.s,
      stats: getStats(vls.tstsg, vls.s),
    },
  }
}
