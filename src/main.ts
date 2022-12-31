import * as core from '@actions/core';
import * as github from '@actions/github';

async function run() {
  try {
    const issueMessage: string = core.getInput('issue-message');
    const prMessage: string = core.getInput('pr-message');
    if (!issueMessage && !prMessage) {
      throw new Error(
        'Action must have at least one of issue-message or pr-message set'
      );
    }
    // Get client and context
    const client = github.getOctokit(
      core.getInput('repo-token', {required: true})
    );
    const context = github.context;

    if (context.payload.action !== 'opened') {
      console.log('No issue or PR was opened, skipping');
      return;
    }

    // Do nothing if it's not a pr or issue
    const isIssue: boolean = !!context.payload.issue;
    if (!isIssue && !context.payload.pull_request) {
      console.log(
        'The event that triggered this action was not a pull request or issue, skipping.'
      );
      return;
    }

    // Do nothing if the sender is from the project's org
    console.log("Checking if the user is from outside the project's org");
    if (!context.payload.sender) {
      throw new Error('Internal error, no sender provided by GitHub');
    }
    const sender: string = context.payload.sender!.login
    const issue: {owner: string; repo: string; number: number} = context.issue

    let isMemberOfProject: boolean = false
    let firstContribution: boolean = false
    let customer: boolean = false
    if (isIssue) {
      console.log("Checking if it's an external account... " )
      console.log("issue.owner: " + issue.owner )
      console.log("sender:      " + sender)

      customer = await isCustomer(client, issue.owner, sender)
      // firstContribution = await isFirstIssue(
      //   client,
      //   issue.owner,
      //   issue.repo,
      //   sender,
      //   issue.number
      // )
    } else {
      customer = await isCustomer(client, issue.owner, sender)
      // firstContribution = await isFirstPull(
      //   client,
      //   issue.owner,
      //   issue.repo,
      //   sender,
      //   issue.number
      // )
    }
    if (customer) {
      console.log('sender identified as customer:  ' + sender)
    } else {
      console.log('Not a customer')
      return
    }

    // TODO: Change to "if no label is set for this type of contribution"
    // Do nothing if no message set for this type of contribution
    const message: string = isIssue ? issueMessage : prMessage;
    if (!message) {
      console.log('No message provided for this type of contribution');
      return;
    }

    const issueType: string = isIssue ? 'issue' : 'pull request';
    // Add a label to the issue or PR
    console.log(`Adding label: 'contribution'' to ${issueType} ${issue.number}`);
    if (isIssue) {
      // TODO: How do we test this locally so we don't have to deploy each time?
      await client.rest.issues.addLabels( {
        owner: issue.owner,
        repo: issue.repo,
        issue_number: issue.number,
        labels: ["contribution"],
      })
    } else {
      // TODO: Could combine this with the block above
      await client.rest.issues.addLabels( {
        owner: issue.owner,
        repo: issue.repo,
        issue_number: issue.number,
        labels: ["contribution"],
      })
    }
  } catch (error) {
    core.setFailed((error as any).message);
    return;
  }
}

async function isCustomer(
    client: ReturnType<typeof github.getOctokit>,
    owner: string,
    sender: string,
): Promise<boolean> {

  // Sanity check!
  return true

  // TODO: Does this only work if it's an org and not an individual user?
  const res = await client.rest.orgs.checkMembershipForUser({
    org: owner,
    username: sender,
  })

  // TODO: Add support for exception cases, like "dependabot"

  if (res.status as number == 204) {
    return false
  } else if (res.status as number == 404) {
    return true
  } else {
    throw new Error(`Received unexpected API status code ${res.status}`);
  }

  return false
}

run();
