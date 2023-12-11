import { IAzureConfig, ITestResult } from './interface'
import { AzureTestPlanReporter } from '@criszalo1997/azuredevops-test-reporter'
import { Capabilities, Frameworks, Options, Services } from '@wdio/types'
import { PickleTag } from '@cucumber/messages'
import { ITestCaseHookParameter, Then } from '@cucumber/cucumber'
import { Test, TestResult } from '@wdio/types/build/Frameworks'

export default class AzureDevopsService implements Services.ServiceInstance {
  private _azureReporter: AzureTestPlanReporter
  private currentScreenshot?: string;
  private withScreenshotSuccess:boolean;
  private withScreenshotFailed:boolean;
  constructor(
    private _options: IAzureConfig,
    private _capabilities: Capabilities.RemoteCapability,
    private _config: Omit<Options.Testrunner, 'capabilities'>
  ) {
    _options = Object.assign(_options, { stdout: true })
    this.withScreenshotSuccess = _options.screenshotSuccess ?? false;
    this.withScreenshotFailed = _options.screenshotFailed ?? false;
    this._azureReporter = new AzureTestPlanReporter(this._options)
  }

  async onPrepare(): Promise<void> {
    await this._azureReporter.init()
    await this._azureReporter.starTestRun()
  }

  async onComplete(): Promise<void> {
    await this._azureReporter.stopTestRun()
  }

  async afterTest(test: Test, context: any, result: TestResult): Promise<void> {
    let caseId = this.parseCaseIDString(test.parent)

    if (caseId == 'notDefined') {
      caseId = this.parseCaseIDString(test.title)
      if (caseId == 'notDefined') {
        return new Promise((resolve) => {
          resolve()
        })
      }
    }

    const testResult: ITestResult = {
      testCaseId: caseId,
      result: result.passed ? 'Passed' : 'Failed',
      message: '', // pass a substring of result.error
    }

    await this._azureReporter.init()
    const runId = await this._azureReporter.getCurrentTestRunId()
    await this._azureReporter.sendTestResult(testResult, runId)
  }

  async afterScenario(
    world: ITestCaseHookParameter,
    result: Frameworks.PickleResult
  ): Promise<void> {
    const caseId = this.parseCaseID(world.pickle.tags)

    if (caseId == 'notDefined') {
      return new Promise((resolve) => {
        resolve()
      })
    }

    const testResult: ITestResult = {
      testCaseId: caseId,
      result: result.passed ? 'Passed' : 'Failed',
      message: result.error || '',
    }

    await this._azureReporter.init()
    const runId = await this._azureReporter.getCurrentTestRunId()
    const sedTest = await this._azureReporter.sendTestResult(testResult, runId)
    
    const passUpload = ((this.withScreenshotSuccess == true && result.passed == true) || (this.withScreenshotFailed == true && result.passed == false)) ? true : false 

    if (sedTest.length > 0 && passUpload == true) {
      sedTest.forEach(async (uniTest) => {
          const screenshot = this.currentScreenshot
          if (screenshot != null) {
            await this._azureReporter.uploadAttachmentTestCase(uniTest.id ?? 0,runId, "GeneralAttachment", "", "Screenshot.png", screenshot)
          }
        });
    }
  }

  async afterCommand(commandName: string, args: any[], result: any, error?: Error): Promise<void> {
    if (commandName == 'takeScreenshot') {
      this.currentScreenshot = result;
    }
  
  }

  private parseCaseID(pickleTags: readonly PickleTag[]): string {
    const caseID = 'notDefined'
    let patt = /@?[cC](\d+)/g

    if (this._options.caseIdRegex) {
      patt = new RegExp(this._options.caseIdRegex, 'g')
    }
    for (const tag of pickleTags) {
      const matchInfo = patt.exec(tag.name)

      if (matchInfo != null) {
        return matchInfo[1]
      }
    }
    return caseID
  }

  private parseCaseIDString(title: string): string {
    const caseID = 'notDefined'
    let patt = /@?[cC](\d+)/g

    if (this._options.caseIdRegex) {
      patt = new RegExp(this._options.caseIdRegex, 'g')
    }

    const matchInfo = patt.exec(title)

    if (matchInfo != null) {
      return matchInfo[1]
    }

    return caseID
  }
  
}
