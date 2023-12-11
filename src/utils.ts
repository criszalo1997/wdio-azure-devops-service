import { CommandArgs, Tag } from "@wdio/reporter";

export class Utils {

  public isScreenshotCommand(command: CommandArgs): boolean {
    const isScrenshotEndpoint = /\/session\/[^/]*(\/element\/[^/]*)?\/screenshot/;

    return (
      // WebDriver protocol
      (command.endpoint && isScrenshotEndpoint.test(command.endpoint)) ||
      // DevTools protocol
      command.command === "takeScreenshot"
    );
  }
}
