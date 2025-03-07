import { openDB, DBSchema, IDBPDatabase } from 'idb'

interface Trade {
  id: string
  symbol: string
  entryDate: string
  exitDate: string | null
  entryPrice: number
  exitPrice: number | null
  positionSize: number
  type: 'long' | 'short'
  stopLoss: number | null
  takeProfit: number | null
  fees: number | null
  strategy: string | null
  notes: string
  screenshot: string | null
  status: 'open' | 'closed'
  createdAt: string
  updatedAt: string
}

interface TradingJournalDB extends DBSchema {
  trades: {
    key: string
    value: Trade
    indexes: {
      'by-date': string
      'by-symbol': string
      'by-status': string
      'by-strategy': string
    }
  }
  settings: {
    key: string
    value: {
      id: string
      data: string[]
    }
  }
}

class DatabaseService {
  private db: IDBPDatabase<TradingJournalDB> | null = null
  private dbName = 'trading-journal'
  private version = 3  // Increment version to trigger upgrade

  async connect() {
    if (this.db) return this.db

    this.db = await openDB<TradingJournalDB>(this.dbName, this.version, {
      async upgrade(db: IDBPDatabase<TradingJournalDB>, oldVersion) {
        // If this is a fresh database, create all stores
        if (!db.objectStoreNames.contains('trades')) {
          const tradesStore = db.createObjectStore('trades', {
            keyPath: 'id',
          })
          
          tradesStore.createIndex('by-date', 'entryDate')
          tradesStore.createIndex('by-symbol', 'symbol')
          tradesStore.createIndex('by-status', 'status')
          tradesStore.createIndex('by-strategy', 'strategy')
        }

        // Handle settings store upgrade
        if (!db.objectStoreNames.contains('settings')) {
          const settingsStore = db.createObjectStore('settings', {
            keyPath: 'id',
          })
          // Initialize with empty arrays
          settingsStore.put({ id: 'strategies', data: [] })
        }

        // Handle migration from version 1 or 2 to 3
        if (oldVersion < 3 && db.objectStoreNames.contains('settings')) {
          // Backup existing data
          const tx = db.transaction(['settings', 'trades'], 'readwrite')
          const settingsStore = tx.objectStore('settings')
          const tradesStore = tx.objectStore('trades')

          // Get existing data
          const existingTrades = await tradesStore.getAll()
          const existingStrategies = await settingsStore.get('strategies')

          // Clear and update settings store with new format
          await settingsStore.clear()
          await settingsStore.put({ 
            id: 'strategies', 
            data: Array.isArray(existingStrategies?.data) ? existingStrategies.data : []
          })

          // Update trades to remove setupType
          if (existingTrades.length > 0) {
            await tradesStore.clear()
            for (const trade of existingTrades) {
              const tradeData = trade as any
              const { setupType, ...tradeWithoutSetup } = tradeData
              await tradesStore.put(tradeWithoutSetup as Trade)
            }
          }
        }
      },
    })

    return this.db
  }

  // Trade operations
  async getAllTrades(): Promise<Trade[]> {
    const db = await this.connect()
    return db.getAll('trades')
  }

  async getTrade(id: string): Promise<Trade | undefined> {
    const db = await this.connect()
    return db.get('trades', id)
  }

  async addTrade(trade: Trade): Promise<string> {
    const db = await this.connect()
    await db.put('trades', trade)
    return trade.id
  }

  async updateTrade(trade: Trade): Promise<string> {
    const db = await this.connect()
    await db.put('trades', trade)
    return trade.id
  }

  async deleteTrade(id: string): Promise<void> {
    const db = await this.connect()
    await db.delete('trades', id)
  }

  // Settings operations
  async getStrategies(): Promise<string[]> {
    const db = await this.connect()
    const result = await db.get('settings', 'strategies')
    return result?.data || []
  }

  async setStrategies(strategies: string[]): Promise<void> {
    const db = await this.connect()
    await db.put('settings', { id: 'strategies', data: strategies })
  }

  // Migration from localStorage
  async migrateFromLocalStorage() {
    // Migrate trades
    const localTrades = localStorage.getItem('trades')
    if (localTrades) {
      const trades = JSON.parse(localTrades)
      for (const trade of trades) {
        const tradeData = trade as any
        const { setupType, ...tradeWithoutSetup } = tradeData
        await this.addTrade(tradeWithoutSetup as Trade)
      }
      localStorage.removeItem('trades')
    }

    // Migrate strategies
    const localStrategies = localStorage.getItem('tradingStrategies')
    if (localStrategies) {
      await this.setStrategies(JSON.parse(localStrategies))
      localStorage.removeItem('tradingStrategies')
    }
  }

  // Export/Import
  async exportData(): Promise<string> {
    const trades = await this.getAllTrades()
    const strategies = await this.getStrategies()

    return JSON.stringify({
      trades,
      strategies,
    }, null, 2)
  }

  async importData(jsonData: string): Promise<void> {
    const data = JSON.parse(jsonData)
    
    // Clear existing data
    const db = await this.connect()
    await db.clear('trades')
    
    // Import new data
    if (data.trades) {
      for (const trade of data.trades) {
        const tradeData = trade as any
        const { setupType, ...tradeWithoutSetup } = tradeData
        await this.addTrade(tradeWithoutSetup as Trade)
      }
    }
    if (data.strategies) {
      await this.setStrategies(data.strategies)
    }
  }

  // Recovery function
  async attemptRecovery(): Promise<boolean> {
    try {
      // Check localStorage for trades
      const localTrades = localStorage.getItem('trades')
      if (localTrades) {
        const trades = JSON.parse(localTrades)
        if (Array.isArray(trades) && trades.length > 0) {
          // Clear existing trades
          const db = await this.connect()
          await db.clear('trades')
          
          // Restore trades from localStorage
          for (const trade of trades) {
            await this.addTrade(trade)
          }
          return true
        }
      }
      return false
    } catch (error) {
      console.error('Recovery attempt failed:', error)
      return false
    }
  }
}

export const db = new DatabaseService()
export type { Trade } 