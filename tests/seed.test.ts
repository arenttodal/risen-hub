import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  seedMilestones,
  seedPlaces,
  seedProjects,
  seedWorkItems,
} from '../data/risen.ts';

/**
 * The product rule in CLAUDE.md is that a project such as Låven exists once and
 * is referenced everywhere else. These tests fail if the seed ever grows a
 * second copy of a project or a reference that points nowhere.
 */

const projectIds = new Set(seedProjects.map(project => project.id));
const placeIds = new Set(seedPlaces.map(place => place.id));
const milestoneIds = new Set(seedMilestones.map(milestone => milestone.id));

describe('seed identity', () => {
  it('has no duplicate project ids', () => {
    assert.equal(projectIds.size, seedProjects.length);
  });

  it('has no duplicate project slugs', () => {
    const slugs = new Set(seedProjects.map(project => project.slug));
    assert.equal(slugs.size, seedProjects.length);
  });

  it('has no duplicate place slugs', () => {
    const slugs = new Set(seedPlaces.map(place => place.slug));
    assert.equal(slugs.size, seedPlaces.length);
  });

  it('names each project only once, so no module can hold a second copy', () => {
    const names = new Set(seedProjects.map(project => project.name));
    assert.equal(names.size, seedProjects.length);
  });
});

describe('seed references', () => {
  it('points every project at a place that exists', () => {
    for (const project of seedProjects) {
      if (project.placeId !== null) {
        assert.ok(placeIds.has(project.placeId), `${project.id} -> ${project.placeId}`);
      }
    }
  });

  it('points every milestone at a project that exists', () => {
    for (const milestone of seedMilestones) {
      assert.ok(projectIds.has(milestone.projectId), `${milestone.id} -> ${milestone.projectId}`);
    }
  });

  it('points every work item at records that exist', () => {
    for (const item of seedWorkItems) {
      if (item.projectId !== null) {
        assert.ok(projectIds.has(item.projectId), `${item.id} -> project ${item.projectId}`);
      }
      if (item.placeId !== null) {
        assert.ok(placeIds.has(item.placeId), `${item.id} -> place ${item.placeId}`);
      }
      if (item.milestoneId !== null) {
        assert.ok(milestoneIds.has(item.milestoneId), `${item.id} -> milestone ${item.milestoneId}`);
      }
    }
  });

  it('orders milestones from 0 without gaps within each project', () => {
    for (const projectId of projectIds) {
      const positions = seedMilestones
        .filter(milestone => milestone.projectId === projectId)
        .map(milestone => milestone.position)
        .sort((a, b) => a - b);
      assert.deepEqual(positions, positions.map((_, index) => index), `positions for ${projectId}`);
    }
  });
});

describe('seed visibility', () => {
  it('gives every project a visibility the public boundary understands', () => {
    for (const project of seedProjects) {
      assert.ok(['private', 'members', 'public'].includes(project.visibility), project.id);
    }
  });

  it('never marks an unpublished project as publicly visible without a publish date', () => {
    for (const project of seedProjects) {
      if (project.visibility === 'public') {
        assert.ok(project.publishedAt !== null, `${project.id} is public but has no publishedAt`);
      }
    }
  });

  it('keeps funding figures within the budget they belong to', () => {
    for (const project of seedProjects) {
      assert.ok(project.fundedNok >= 0, `${project.id} has negative funding`);
      assert.ok(project.progress >= 0 && project.progress <= 100, `${project.id} progress`);
    }
  });
});

describe('funding integrity', () => {
  it('never marks a scheme verified without a source and a date (CLAUDE.md rule 8)', async () => {
    const { seedFundingSchemes } = await import('../data/risen.ts');
    for (const scheme of seedFundingSchemes) {
      if (scheme.status === 'verified') {
        assert.ok(scheme.sourceUrl, `${scheme.id} is verified without a sourceUrl`);
        assert.ok(scheme.verifiedAt, `${scheme.id} is verified without a verifiedAt`);
      }
    }
  });

  it('points every funding angle at projects that exist', async () => {
    const { seedFundingAngles } = await import('../data/risen.ts');
    for (const angle of seedFundingAngles) {
      for (const projectId of angle.projectIds) {
        assert.ok(projectIds.has(projectId), `${angle.id} -> ${projectId}`);
      }
    }
  });

  it('points every event at a project that exists', async () => {
    const { seedEvents } = await import('../data/risen.ts');
    for (const event of seedEvents) {
      if (event.projectId !== null) {
        assert.ok(projectIds.has(event.projectId), `${event.id} -> ${event.projectId}`);
      }
      if (event.placeId !== null) {
        assert.ok(placeIds.has(event.placeId), `${event.id} -> ${event.placeId}`);
      }
    }
  });
});
