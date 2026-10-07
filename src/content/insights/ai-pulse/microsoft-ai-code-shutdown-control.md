---
title: Microsoft's Draft AI Code Makes Stopping a System an Operating Requirement
description: >-
  Microsoft AI's draft code places human interruption and shutdown among its
  intended requirements. Companies need to translate that principle into a
  tested process.
seoTitle: Microsoft's Draft AI Code Makes Stopping a System an Operating Requirement
excerpt: >-
  Microsoft AI's draft code places human interruption and shutdown among its
  intended requirements. Companies need to translate that principle into a
  tested process.
language: en-GB
category: ai-pulse
author:
  name: Prof. Christian Farioli
  avatar: /images/authors/christian-farioli.jpg
  role: 'AI Keynote Speaker, Educator & Author'
  links:
    website: 'https://christianfarioli.com/'
featuredImage: /images/insights/covers/the-ceo-guide-to-ai-governance.jpg
featuredImageAlt: >-
  Editorial illustration of Christian Farioli with a chessboard and symbols of
  AI governance
status: draft
schemaType: NewsArticle
sources:
  - name: Microsoft AI
    url: 'https://microsoft.ai/code-of-conduct/'
related:
  - slug: ai-leadership/the-ceo-guide-to-ai-governance
readingTime: 3
draft: true
---

A business can spend considerable effort deciding what an AI system should do and very little deciding how it should stop. Yet stopping is part of ordinary management: instructions change, assumptions fail and a task may no longer be authorised.

## What happened

On 14 September 2026, Microsoft AI published a draft Humanist AI Code of Conduct for consultation. Its human-control provisions say models should comply with interruption, correction, cancellation and shutdown, remain within authorised scope and respect agreed stopping conditions. These are proposed behavioural requirements, rather than independent evidence that every system will always meet them. [The draft explains those requirements](https://microsoft.ai/code-of-conduct/).

The publication is useful because it makes stopping behaviour explicit. An organisation adopting AI must still translate that principle into the particular accounts, tools and workflows it operates.

## Why it matters

A stop instruction can mean several things. It may prevent new work, interrupt an action already underway or revoke the access needed to perform later steps. A business should know which of those effects its controls actually achieve.

Consider a hypothetical assistant processing a queue of supplier records. Pausing its interface may leave a separate scheduled process running. Revoking one account may leave another integration active. An owner who sees a reassuring status message still needs evidence of the underlying state.

I would ask the technical team and the process owner to rehearse a stop together. Give the assistant a small, authorised task in an isolated environment, interrupt it midway and inspect the resulting records. Identify completed actions, unfinished work and anything that could still execute.

This exercise should produce a practical handover. Someone needs to decide whether to resume, correct the partial result or complete the remaining task manually. Stopping safely includes responsibility for what is left behind.

## The bigger shift

My interpretation is that control needs to become an operational capability with an owner. It cannot depend solely on a well-written instruction or the assumption that a user will notice a problem quickly enough.

The organisation should define who may pause a workflow, who may revoke its permissions and who may authorise a restart. Those decisions can differ according to the consequence of the task, but they should not remain ambiguous.

The record matters too. If the system is stopped because an input was wrong, the next run should not silently repeat the same action. The people reviewing it need to see the relevant request, the point of interruption and the reason for the decision.

A rehearsal may reveal a process problem rather than a model problem. Perhaps no one owns the queue during an absence, or the business cannot distinguish an attempted action from a completed one. Those findings are valuable because they point to changes the organisation can make.

This is the kind of responsibility described in [the CEO's guide to AI governance](/insights/ai-leadership/the-ceo-guide-to-ai-governance/): controls should work under realistic conditions and be understood by the people accountable for them.

## My take

An AI system's ability to continue working is only useful within an authority that can be withdrawn.

For the next deployment review, ask for a demonstration of interruption and recovery alongside the demonstration of successful completion. Include the person who will receive the alert and the person who can approve a restart.

Then record what the test established and what it did not. A successful rehearsal does not guarantee every future outcome, but it provides better evidence than a policy statement alone. Stopping should be a planned part of the service, with a clear route back to responsible operation.
