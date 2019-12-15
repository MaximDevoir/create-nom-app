#!/usr/bin/env node

import chalk from 'chalk'
import { sync as spawnSync } from 'cross-spawn'
import commander from 'commander'
import minimist from 'minimist'

import logger from './packages/logger'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version } = require('../package.json')

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  throw reason
})

const scriptsString = `${chalk.blue('start')} | ${chalk.blue('test')} | ${chalk.blue('build')}`

function main(): void {
  let script: null | string = null

  const program = new commander.Command('nom-scripts')
    .arguments('command')
    .usage(scriptsString)
    .action((command: commander.Command) => {
      const commandArg0 = command.args[0]
      if (typeof commandArg0 !== 'string') {
        return
      }
      script = commandArg0
    })
    .option('-v, --version', `output the version number ${version}`, () => {
      console.log(`v${version}`)
      process.exit(0)
    })
    .option('-V', '', () => {
      console.log(`v${version}`)
      process.exit(0)
    })
    .option('--verbose', 'display low-level debugging information', () => {
      process.env.LOG_LEVEL = 'debug'
    })
    .allowUnknownOption()

  program.parse(process.argv)
  if (typeof script !== 'string' || script!.length === 0) {
    console.log(`A command is required by ${chalk.green('nom-scripts')} to run.\n`)
    console.log(`${chalk.green('nom-scripts')} ${scriptsString}\n`)
    commander.help()
  }

  switch (script) {
    case 'start':
    case 'test':
    case 'build':
    case 'init':
    case 'eject': {
      logger.debug('spawning', `./scripts/${script}`)

      const argsToForward: string[] = []
      const receivedArgs = minimist(process.argv.slice(3))

      Object.keys(receivedArgs).forEach(arg => {
        if (arg === '_') {
          argsToForward.push(...receivedArgs._)
          return
        }

        const value = receivedArgs[arg]

        if (typeof value === 'boolean') {
          argsToForward.push(`--${arg}`)
        } else {
          argsToForward.push(`--${arg}=${value}`)
        }
      })

      // Either Webpack or Babel override and mangle Node `resolve` behavior. A
      // solution is to place statement in `eval`.
      // https://github.com/webpack/webpack/issues/1554#issuecomment-336462319
      // eslint-disable-next-line no-eval
      const proc = spawnSync('node', [eval(`require.resolve('./scripts/${script}')`)].concat(argsToForward), {
        stdio: 'inherit'
      })

      if (proc.signal) {
        if (proc.signal === 'SIGKILL') {
          // https://www.unix.com/302096767-post5.html?s=de4e02dec039bad162ad857af7942bda
          console.log('The script failed to finish because the program received a kill signal.')
          console.log('')
          console.log('Possible causes are:')
          console.log('   * The system ran out of memory')
          console.log('   * The system is shutting down')
          console.log('   * The process received kill(-9)\n')
          // console.log('https://TODO:base-url/create-nom-app/docs/terminated-by-sigkill')
        } else if (proc.signal === 'SIGTERM') {
          console.log('The script failed to finish because the program received a termination signal.')
          console.log('')
          console.log('Possible causes are:')
          console.log('   * A user killed the process')
          console.log('   * The system is shutting down\n')
          // console.log('https://TODO:base-url/create-nom-app/docs/terminated-by-sigterm')
        }

        process.exit(1)
      }

      if (proc.status) {
        process.exit(proc.status || 128)
      }
      break
    }
    default:
      console.log(`Unrecognized script ${chalk.blue(script)}.`)
      console.log(`You may need to update your ${chalk.green('nom-scripts')} dependency.`)
      // console.log('To learn more about this message, visit:')
      // console.log('https://TODO:base-url/create-nom-app/docs/unrecognized-script')
      break
  }

  return undefined
}

main()
