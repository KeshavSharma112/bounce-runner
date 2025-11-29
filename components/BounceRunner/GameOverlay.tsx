
import React, { useState, useEffect, useRef } from 'react'
import { GameStatus } from '../../types'
import { THEMES, FICTIONAL_USERNAMES, getThemeForDistance } from '../../constants'
import Button from '../UI/Button'

interface LeaderboardEntry {
  username: string
  score: number
  isNew?: boolean
}

interface GameOverlayProps {
  status: GameStatus
  score: number
  highScore: number
  currentThemeId: string
  coins: number
  combo: number
  maxCombo?: number
  onStart: () => void
  onRestart: () => void
}

// Generate random leaderboard entries
const generateLeaderboardEntries = (playerScore: number): LeaderboardEntry[] => {
  const entries: LeaderboardEntry[] = []
  const usedNames = new Set<string>()

  // Generate 15 random entries around the player's score
  for (let i = 0; i < 15; i++) {
    let username = FICTIONAL_USERNAMES[Math.floor(Math.random() * FICTIONAL_USERNAMES.length)]
    while (usedNames.has(username)) {
      username = FICTIONAL_USERNAMES[Math.floor(Math.random() * FICTIONAL_USERNAMES.length)]
    }
    usedNames.add(username)

    // Score varies around player score with some randomness
    const baseScore = playerScore > 100 ? playerScore : 500
    const variance = baseScore * 0.8
    const randomScore = Math.floor(baseScore + (Math.random() - 0.3) * variance)

    entries.push({
      username,
      score: Math.max(50, randomScore),
      isNew: Math.random() > 0.7
    })
  }

  return entries.sort((a, b) => b.score - a.score)
}

const GameOverlay: React.FC<GameOverlayProps> = ({
  status,
  score,
  highScore,
  currentThemeId,
  coins = 0,
  combo = 0,
  maxCombo = 0,
  onStart,
  onRestart,
}) => {
  const currentTheme = THEMES.find(t => t.id === currentThemeId) || THEMES[0]
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [visibleStartIndex, setVisibleStartIndex] = useState(0)
  const leaderboardRef = useRef<LeaderboardEntry[]>([])

  // Initialize and update leaderboard
  useEffect(() => {
    if (status === GameStatus.PLAYING) {
      leaderboardRef.current = generateLeaderboardEntries(score)
      setLeaderboard(leaderboardRef.current)
    } else if (status === GameStatus.GAME_OVER) {
      // Generate leaderboard with player's score included
      const entries = generateLeaderboardEntries(Math.max(score, highScore))
      // Insert player's score
      const playerEntry: LeaderboardEntry = {
        username: 'YOU',
        score: score,
        isNew: true
      }
      entries.push(playerEntry)
      entries.sort((a, b) => b.score - a.score)
      leaderboardRef.current = entries
      setLeaderboard(entries)
    }
  }, [status, score, highScore])

  // Rotate leaderboard entries every 3 seconds (only during gameplay)
  useEffect(() => {
    if (status !== GameStatus.PLAYING) return

    const interval = setInterval(() => {
      // Sometimes add a new "live" entry
      if (Math.random() > 0.5) {
        const newUsername = FICTIONAL_USERNAMES[Math.floor(Math.random() * FICTIONAL_USERNAMES.length)]
        const newScore = Math.floor(score * (0.5 + Math.random()))

        const newEntry: LeaderboardEntry = {
          username: newUsername,
          score: Math.max(50, newScore),
          isNew: true
        }

        leaderboardRef.current = [newEntry, ...leaderboardRef.current.slice(0, 14)]
          .sort((a, b) => b.score - a.score)

        setLeaderboard([...leaderboardRef.current])
      }

      // Rotate visible entries
      setVisibleStartIndex(prev => (prev + 1) % Math.max(1, leaderboardRef.current.length - 3))
    }, 3000)

    return () => clearInterval(interval)
  }, [status, score])

  // Get visible leaderboard entries (4 at a time during gameplay)
  const visibleLeaderboard = status === GameStatus.PLAYING
    ? leaderboard.slice(visibleStartIndex, visibleStartIndex + 4)
    : leaderboard.slice(0, 10) // Show top 10 on game over

  // Get unlocked themes for display
  const unlockedThemes = THEMES.filter(t => Math.max(score, highScore) >= t.unlockScore)

  // Get next milestone
  const getNextMilestone = () => {
    for (const theme of THEMES) {
      if (Math.max(score, highScore) < theme.unlockScore) {
        return { theme, remaining: theme.unlockScore - Math.max(score, highScore) }
      }
    }
    return null
  }

  const nextMilestone = getNextMilestone()

  // Active theme during gameplay based on score
  const activeTheme = status === GameStatus.PLAYING ? getThemeForDistance(score) : currentTheme

  if (status === GameStatus.PLAYING) {
    return (
      <>
        {/* Top Left - Live Leaderboard */}
        <div className="absolute top-4 left-4 w-56 pointer-events-none select-none z-20">
          <div className="bg-black/60 backdrop-blur-sm rounded-lg border border-white/10 p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs text-gray-400 uppercase tracking-widest">Live Scores</span>
            </div>

            <div className="space-y-1">
              {visibleLeaderboard.map((entry, idx) => (
                <div
                  key={`${entry.username}-${idx}`}
                  className={`flex justify-between items-center text-sm py-1 px-2 rounded transition-all duration-300 ${entry.isNew ? 'bg-green-500/20 animate-pulse' : 'bg-white/5'
                    }`}
                >
                  <span className="text-gray-300 truncate max-w-[120px]">
                    {entry.isNew && <span className="text-green-400 mr-1">●</span>}
                    {entry.username}
                  </span>
                  <span
                    className="font-bold"
                    style={{ color: getThemeForDistance(entry.score).primary }}
                  >
                    {entry.score.toLocaleString()}m
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Center - Distance */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 pointer-events-none select-none z-20">
          <div className="text-center">
            <span className="text-xs text-gray-400 uppercase tracking-widest drop-shadow-md">Distance</span>
            <div
              className="text-5xl font-bold drop-shadow-[0_0_20px_rgba(255,255,255,0.5)] transition-colors duration-500"
              style={{ color: activeTheme.primary }}
            >
              {Math.floor(score)}
              <span className="text-xl ml-1 text-white/50">m</span>
            </div>
          </div>
        </div>

        {/* Top Right - Stats Panel */}
        <div className="absolute top-4 right-4 w-56 pointer-events-none select-none z-20">
          <div className="bg-black/60 backdrop-blur-sm rounded-lg border border-white/10 p-3 space-y-3">
            {/* High Score */}
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400 uppercase">Best</span>
              <span className="text-lg text-purple-400 font-bold">{Math.floor(highScore)}m</span>
            </div>

            {/* Coins */}
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400 uppercase flex items-center gap-1">
                <span className="text-yellow-400">●</span> Coins
              </span>
              <span className="text-lg text-yellow-400 font-bold">{coins}</span>
            </div>

            {/* Combo */}
            {combo > 1 && (
              <div className="flex justify-between items-center animate-pulse">
                <span className="text-xs text-cyan-400 uppercase">Combo</span>
                <span className="text-lg text-cyan-400 font-bold">{combo}x</span>
              </div>
            )}

            {/* Current Theme */}
            <div className="flex justify-between items-center pt-2 border-t border-white/10">
              <span className="text-xs text-gray-400 uppercase">Power</span>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full shadow-lg"
                  style={{ backgroundColor: activeTheme.primary, boxShadow: `0 0 8px ${activeTheme.primary}` }}
                />
                <span className="text-xs text-white">{activeTheme.name}</span>
              </div>
            </div>

            {/* Unlocked Colors */}
            <div className="pt-2 border-t border-white/10">
              <span className="text-xs text-gray-400 uppercase block mb-2">Unlocked</span>
              <div className="flex gap-1">
                {unlockedThemes.map(t => (
                  <div
                    key={t.id}
                    className="w-5 h-5 rounded-full border-2 border-white/20 transition-transform hover:scale-110"
                    style={{ backgroundColor: t.primary, boxShadow: `0 0 5px ${t.primary}` }}
                    title={t.name}
                  />
                ))}
              </div>
            </div>

            {/* Next Milestone Progress */}
            {nextMilestone && (
              <div className="pt-2 border-t border-white/10">
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-gray-400">Next: {nextMilestone.theme.name}</span>
                  <span style={{ color: nextMilestone.theme.primary }}>
                    {nextMilestone.theme.unlockScore.toLocaleString()}m
                  </span>
                </div>
                <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, (Math.max(score, highScore) / nextMilestone.theme.unlockScore) * 100)}%`,
                      backgroundColor: nextMilestone.theme.primary
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </>
    )
  }

  if (status === GameStatus.MENU) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0f0f17]/80 backdrop-blur-sm z-10">
        <div className="mb-12 text-center animate-fade-in-up">
          <h1 className="text-6xl md:text-8xl text-white mb-2 drop-shadow-[0_0_25px_rgba(115,61,242,0.6)]">
            BOUNCE
            <span
              className="text-transparent bg-clip-text bg-gradient-to-r"
              style={{
                backgroundImage: `linear-gradient(to right, ${currentTheme.primary}, #00F0FF)`
              }}
            >
              RUNNER
            </span>
          </h1>
          <p className="text-gray-400 text-lg md:text-xl font-light tracking-wide flex items-center justify-center gap-2">
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: currentTheme.primary }}
            />
            SYSTEM READY
          </p>

          {/* Current power indicator */}
          <div className="mt-4 flex items-center justify-center gap-3">
            <span className="text-xs text-gray-500 uppercase">Starting Power:</span>
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full shadow-lg animate-pulse"
                style={{ backgroundColor: currentTheme.primary, boxShadow: `0 0 15px ${currentTheme.primary}` }}
              />
              <span className="text-sm text-white">{currentTheme.name}</span>
            </div>
          </div>

          {/* Unlocked colors */}
          {unlockedThemes.length > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              {unlockedThemes.map(t => (
                <div
                  key={t.id}
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: t.primary, boxShadow: `0 0 8px ${t.primary}` }}
                  title={t.name}
                />
              ))}
            </div>
          )}

          {nextMilestone && (
            <div className="mt-3 text-xs text-gray-600">
              Next unlock at {nextMilestone.theme.unlockScore.toLocaleString()}m
            </div>
          )}
        </div>

        <div className="flex gap-4">
          <Button
            label="INITIATE RUN"
            onClick={onStart}
            className="start-btn"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
          />
        </div>
      </div>
    )
  }

  if (status === GameStatus.GAME_OVER) {
    const newUnlock = THEMES.find(t => score >= t.unlockScore && highScore < t.unlockScore)
    const isNewRecord = score > highScore
    const playerRank = leaderboard.findIndex(entry => entry.username === 'YOU') + 1

    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#0f0f17]/95 backdrop-blur-md z-10 overflow-y-auto">
        <div className="w-full max-w-6xl px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mb-2 text-[#ff4444] tracking-widest uppercase text-sm animate-pulse">Connection Lost</div>
            <h2 className="text-5xl md:text-7xl text-white mb-4">TERMINATED</h2>

            {newUnlock && (
              <div
                className="inline-block text-black px-6 py-2 rounded-full text-sm shadow-lg animate-bounce font-bold mb-4"
                style={{
                  background: `linear-gradient(to right, ${newUnlock.primary}, ${newUnlock.accent})`
                }}
              >
                🎉 NEW POWER UNLOCKED: {newUnlock.name.toUpperCase()}
              </div>
            )}
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Left Column - Leaderboard */}
            <div className="lg:col-span-1">
              <div className="bg-black/60 backdrop-blur-sm rounded-lg border border-white/10 p-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <h3 className="text-white text-sm uppercase tracking-widest">Global Leaderboard</h3>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {visibleLeaderboard.map((entry, idx) => {
                    const isPlayer = entry.username === 'YOU'
                    const entryTheme = getThemeForDistance(entry.score)

                    return (
                      <div
                        key={`${entry.username}-${idx}`}
                        className={`flex justify-between items-center py-2 px-3 rounded transition-all ${isPlayer
                          ? 'bg-gradient-to-r from-purple-500/30 to-cyan-500/30 border-2 border-purple-400'
                          : 'bg-white/5 hover:bg-white/10'
                          } ${entry.isNew && !isPlayer ? 'animate-pulse' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`text-xs font-bold w-6 text-right ${isPlayer ? 'text-yellow-400' : 'text-gray-400'}`}>
                            #{idx + 1}
                          </span>
                          <span className={`text-sm ${isPlayer ? 'font-bold text-yellow-400' : 'text-gray-300'}`}>
                            {entry.isNew && !isPlayer && <span className="text-green-400 mr-1">●</span>}
                            {entry.username}
                          </span>
                        </div>
                        <span
                          className="font-bold text-sm"
                          style={{ color: entryTheme.primary }}
                        >
                          {entry.score.toLocaleString()}m
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Center Column - Session Summary */}
            <div className="lg:col-span-1">
              <div className="bg-black/60 backdrop-blur-sm rounded-lg border border-white/10 p-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <h3 className="text-white text-sm uppercase tracking-widest">Session Summary</h3>
                </div>

                <div className="space-y-4">
                  {/* Distance */}
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-xs text-gray-400 uppercase mb-1">Distance Traveled</div>
                    <div className="text-3xl font-bold text-white">
                      {Math.floor(score).toLocaleString()}
                      <span className="text-lg text-white/50 ml-1">m</span>
                    </div>
                    {isNewRecord && (
                      <div className="text-xs text-yellow-400 mt-1 animate-pulse">⭐ NEW RECORD!</div>
                    )}
                  </div>

                  {/* Top Score */}
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-xs text-gray-400 uppercase mb-1">All-Time Best</div>
                    <div
                      className="text-3xl font-bold"
                      style={{ color: currentTheme.primary }}
                    >
                      {Math.floor(Math.max(score, highScore)).toLocaleString()}
                      <span className="text-lg text-white/50 ml-1">m</span>
                    </div>
                  </div>

                  {/* Powerups Collected */}
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-xs text-gray-400 uppercase mb-1 flex items-center gap-1">
                      <span className="text-yellow-400">●</span> Powerups Collected
                    </div>
                    <div className="text-3xl font-bold text-yellow-400">
                      {coins}
                      <span className="text-lg text-white/50 ml-1">coins</span>
                    </div>
                  </div>

                  {/* Max Combo */}
                  {maxCombo > 1 && (
                    <div className="bg-white/5 rounded-lg p-3">
                      <div className="text-xs text-gray-400 uppercase mb-1">Max Combo</div>
                      <div className="text-3xl font-bold text-cyan-400">
                        {maxCombo}x
                      </div>
                    </div>
                  )}

                  {/* Current Power Level */}
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-xs text-gray-400 uppercase mb-2">Power Level</div>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full shadow-lg"
                        style={{ backgroundColor: currentTheme.primary, boxShadow: `0 0 15px ${currentTheme.primary}` }}
                      />
                      <div>
                        <div className="text-lg font-bold text-white">{currentTheme.name}</div>
                        <div className="text-xs text-gray-400">Unlocked at {currentTheme.unlockScore.toLocaleString()}m</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Stats & Powers */}
            <div className="lg:col-span-1">
              <div className="bg-black/60 backdrop-blur-sm rounded-lg border border-white/10 p-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-purple-500" />
                  <h3 className="text-white text-sm uppercase tracking-widest">Your Powers</h3>
                </div>

                {/* Unlocked Powers Grid */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {THEMES.map(theme => {
                    const isUnlocked = Math.max(score, highScore) >= theme.unlockScore
                    const isCurrent = theme.id === currentThemeId

                    return (
                      <div
                        key={theme.id}
                        className={`relative p-3 rounded-lg border-2 transition-all ${isUnlocked
                          ? isCurrent
                            ? 'border-white bg-white/10'
                            : 'border-white/20 bg-white/5'
                          : 'border-white/10 bg-black/20 opacity-40'
                          }`}
                      >
                        <div
                          className="w-full h-12 rounded mb-2 flex items-center justify-center"
                          style={{
                            backgroundColor: isUnlocked ? theme.primary : '#333',
                            boxShadow: isUnlocked ? `0 0 10px ${theme.primary}` : 'none'
                          }}
                        />
                        <div className="text-xs text-center text-white">{theme.name}</div>
                        {!isUnlocked && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
                            <span className="text-[10px] text-white bg-black/50 px-1 rounded">
                              {theme.unlockScore.toLocaleString()}m
                            </span>
                          </div>
                        )}
                        {isCurrent && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full border-2 border-black" />
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Next Milestone Progress */}
                {nextMilestone && (
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="flex justify-between items-center text-xs mb-2">
                      <span className="text-gray-400">Next Power:</span>
                      <span style={{ color: nextMilestone.theme.primary }}>
                        {nextMilestone.theme.unlockScore.toLocaleString()}m
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, (Math.max(score, highScore) / nextMilestone.theme.unlockScore) * 100)}%`,
                          backgroundColor: nextMilestone.theme.primary
                        }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1 text-center">
                      {nextMilestone.remaining.toLocaleString()}m remaining
                    </div>
                  </div>
                )}

                {/* Rank Display */}
                {playerRank > 0 && (
                  <div className="mt-4 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 rounded-lg p-3 border border-purple-400/30">
                    <div className="text-xs text-gray-400 uppercase mb-1">Your Rank</div>
                    <div className="text-2xl font-bold text-yellow-400">#{playerRank}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {playerRank === 1 ? '🏆 CHAMPION!' : `Out of ${leaderboard.length} players`}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex justify-center">
            <Button
              label="RETRY"
              onClick={onRestart}
              variant="primary"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              }
            />
          </div>
        </div>
      </div>
    )
  }

  return null
}

export default GameOverlay
