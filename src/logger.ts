import fs from 'fs'

class Logger {
  writeStream: fs.WriteStream
  liveLogging: boolean

  constructor() {
    this.liveLogging = false
    this.writeStream = fs.createWriteStream('ezpage.log')
  }
}

const logger = new Logger()
const log = (...messages: unknown[]): void => {
  messages.forEach((message) => {
    if (message && typeof message === 'object') message = JSON.stringify(message, null, 2)
    if (logger.liveLogging) console.log(message)
    logger.writeStream.write(message + '\n')
  })
}

export { log }
