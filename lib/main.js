"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const issueMessage = core.getInput('issue-message');
            const prMessage = core.getInput('pr-message');
            if (!issueMessage && !prMessage) {
                throw new Error('Action must have at least one of issue-message or pr-message set');
            }
            // Get client and context
            const client = github.getOctokit(core.getInput('repo-token', { required: true }));
            const context = github.context;
            if (context.payload.action !== 'opened') {
                console.log('No issue or PR was opened, skipping');
                return;
            }
            // Do nothing if it's not a pr or issue
            const isIssue = !!context.payload.issue;
            if (!isIssue && !context.payload.pull_request) {
                console.log('The event that triggered this action was not a pull request or issue, skipping.');
                return;
            }
            // Do nothing if the sender is from the project's org
            console.log("Checking if the user is from outside the project's org");
            if (!context.payload.sender) {
                throw new Error('Internal error, no sender provided by GitHub');
            }
            const sender = context.payload.sender.login;
            const issue = context.issue;
            let customer = false;
            if (isIssue) {
                console.log("Checking if it's an external account... ");
                console.log("issue.owner: " + issue.owner);
                console.log("sender:      " + sender);
                customer = yield isCustomer(client, issue.owner, sender);
            }
            else {
                customer = yield isCustomer(client, issue.owner, sender);
            }
            if (customer) {
                console.log('sender identified as customer:  ' + sender);
            }
            else {
                console.log('Not a customer');
                return;
            }
            // TODO: Change to "if no label is set for this type of contribution"
            // Do nothing if no message set for this type of contribution
            const message = isIssue ? issueMessage : prMessage;
            if (!message) {
                console.log('No message provided for this type of contribution');
                return;
            }
            const issueType = isIssue ? 'issue' : 'pull request';
            // Add a label to the issue or PR
            console.log(`Adding label: 'contribution'' to ${issueType} ${issue.number}`);
            if (isIssue) {
                // TODO: How do we test this locally so we don't have to deploy each time?
                yield client.rest.issues.addLabels({
                    owner: issue.owner,
                    repo: issue.repo,
                    issue_number: issue.number,
                    labels: ["contribution"],
                });
            }
            else {
                // TODO: Could combine this with the block above
                yield client.rest.issues.addLabels({
                    owner: issue.owner,
                    repo: issue.repo,
                    issue_number: issue.number,
                    labels: ["contribution"],
                });
            }
        }
        catch (error) {
            core.setFailed(error.message);
            return;
        }
    });
}
function isCustomer(client, owner, sender) {
    return __awaiter(this, void 0, void 0, function* () {
        // TODO: Does this only work if it's an org and not an individual user?
        const res = yield client.rest.orgs.checkMembershipForUser({
            org: owner,
            username: sender,
        });
        // Sanity check!
        console.log('Sanity check... returning true...');
        return true;
        // TODO: Add support for exception cases, like "dependabot"
        if (res.status == 204) {
            return false;
        }
        else if (res.status == 404) {
            return true;
        }
        else {
            throw new Error(`Received unexpected API status code ${res.status}`);
        }
        return false;
    });
}
run();
