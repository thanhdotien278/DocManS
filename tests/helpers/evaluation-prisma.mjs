/**
 * EP-03 in-memory Prisma tables shared by the proposal test suites.
 *
 * The suites each build their own fake `prisma` around a plain object store; this adds the four
 * evaluation tables (ST-3.2 .. ST-3.5) plus the extra `user` reads the evaluation services need, so
 * the same behaviour is not re-implemented per file.
 */

function nextId(prefix, collection) {
  return `${prefix}-${collection.length + 1}`;
}

function matchesWhere(record, where = {}) {
  return Object.entries(where).every(([key, condition]) => {
    if (condition === undefined) {
      return true;
    }
    if (condition && typeof condition === "object" && Array.isArray(condition.in)) {
      return condition.in.includes(record[key]);
    }
    return record[key] === condition;
  });
}

/**
 * @param store   the suite's mutable store object; the evaluation collections are created on it
 * @param accounts the user fixtures the suite uses, so relation `include`s can resolve display names
 */
export function createEvaluationTables(store, accounts = []) {
  store.reviewAssignments ??= [];
  store.reviews ??= [];
  store.evaluationSummaries ??= [];
  store.decisions ??= [];

  const findAccount = (id) => accounts.find((account) => account.id === id) ?? null;

  function withAssignmentRelations(record, include) {
    if (!include) {
      return record;
    }

    const reviewer = findAccount(record.reviewerUserId);
    const assignedBy = findAccount(record.assignedById);
    const proposal = store.proposals.find((item) => item.id === record.proposalId) ?? null;

    return {
      ...record,
      ...(include.reviewer
        ? { reviewer: reviewer ? { displayName: reviewer.displayName, username: reviewer.username, unit: reviewer.unit ?? "" } : null }
        : {}),
      ...(include.assignedBy ? { assignedBy: assignedBy ? { displayName: assignedBy.displayName } : null } : {}),
      ...(include.proposal ? { proposal } : {})
    };
  }

  function withReviewRelations(record, include) {
    if (!include?.reviewer) {
      return record;
    }
    const reviewer = findAccount(record.reviewerUserId);
    return { ...record, reviewer: reviewer ? { displayName: reviewer.displayName } : null };
  }

  return {
    proposalReviewAssignment: {
      async create({ data, include }) {
        const record = {
          id: nextId("assignment", store.reviewAssignments),
          assignmentRole: "reviewer",
          status: "assigned",
          dueDate: null,
          revokedAt: null,
          completedAt: null,
          assignedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data
        };
        store.reviewAssignments.push(record);
        return withAssignmentRelations(record, include);
      },
      async update({ where, data, include }) {
        const index = store.reviewAssignments.findIndex((item) => item.id === where.id);
        store.reviewAssignments[index] = { ...store.reviewAssignments[index], ...data, updatedAt: new Date() };
        return withAssignmentRelations(store.reviewAssignments[index], include);
      },
      async updateMany({ where, data }) {
        let count = 0;
        store.reviewAssignments = store.reviewAssignments.map((item) => {
          if (!matchesWhere(item, where)) {
            return item;
          }
          count += 1;
          return { ...item, ...data, updatedAt: new Date() };
        });
        return { count };
      },
      async findUnique({ where, include }) {
        const record = store.reviewAssignments.find((item) => item.id === where.id) ?? null;
        return record ? withAssignmentRelations(record, include) : null;
      },
      async findFirst({ where, include }) {
        const record = store.reviewAssignments.find((item) => matchesWhere(item, where)) ?? null;
        return record ? withAssignmentRelations(record, include) : null;
      },
      async findMany({ where, include } = {}) {
        return store.reviewAssignments.filter((item) => matchesWhere(item, where)).map((item) => withAssignmentRelations(item, include));
      }
    },
    proposalReview: {
      async create({ data, include }) {
        const record = {
          id: nextId("review", store.reviews),
          status: "draft",
          scoreData: null,
          totalScore: null,
          comment: null,
          recommendation: null,
          submittedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data
        };
        store.reviews.push(record);
        return withReviewRelations(record, include);
      },
      async update({ where, data, include }) {
        const index = store.reviews.findIndex((item) => item.id === where.id);
        store.reviews[index] = { ...store.reviews[index], ...data, updatedAt: new Date() };
        return withReviewRelations(store.reviews[index], include);
      },
      async findFirst({ where, include }) {
        const record = store.reviews.find((item) => matchesWhere(item, where)) ?? null;
        return record ? withReviewRelations(record, include) : null;
      },
      async findMany({ where, include } = {}) {
        return store.reviews.filter((item) => matchesWhere(item, where)).map((item) => withReviewRelations(item, include));
      }
    },
    proposalEvaluationSummary: {
      async create({ data }) {
        const record = {
          id: nextId("summary", store.evaluationSummaries),
          status: "draft",
          markedReadyAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data
        };
        store.evaluationSummaries.push(record);
        return record;
      },
      async update({ where, data }) {
        const index = store.evaluationSummaries.findIndex((item) => item.id === where.id);
        store.evaluationSummaries[index] = { ...store.evaluationSummaries[index], ...data, updatedAt: new Date() };
        return store.evaluationSummaries[index];
      },
      async findFirst({ where, include }) {
        const record = store.evaluationSummaries.find((item) => matchesWhere(item, where)) ?? null;
        if (!record || !include?.updatedBy) {
          return record;
        }
        const updatedBy = findAccount(record.updatedById);
        return { ...record, updatedBy: updatedBy ? { displayName: updatedBy.displayName } : null };
      }
    },
    proposalDecision: {
      async create({ data, include }) {
        const record = {
          id: nextId("decision", store.decisions),
          note: null,
          decidedAt: new Date(),
          createdAt: new Date(),
          ...data
        };
        store.decisions.push(record);
        if (!include?.decidedBy) {
          return record;
        }
        const decidedBy = findAccount(record.decidedById);
        return { ...record, decidedBy: decidedBy ? { displayName: decidedBy.displayName } : null };
      },
      async findMany({ where, include } = {}) {
        return store.decisions
          .filter((item) => matchesWhere(item, where))
          .map((item) => {
            if (!include?.decidedBy) {
              return item;
            }
            const decidedBy = findAccount(item.decidedById);
            return { ...item, decidedBy: decidedBy ? { displayName: decidedBy.displayName } : null };
          });
      }
    }
  };
}

/** `user.findFirst` for reviewer-candidate lookup, alongside whatever `user.findMany` a suite has. */
export function createUserLookup(accounts) {
  return {
    async findFirst({ where }) {
      const account = accounts.find(
        (item) => (where?.id && item.id === where.id) || (where?.usernameKey && item.username.toLowerCase() === where.usernameKey)
      );
      if (!account) {
        return null;
      }
      return {
        id: account.id,
        username: account.username,
        displayName: account.displayName,
        status: account.status ?? "active",
        role: account.role,
        unit: account.unit ?? ""
      };
    }
  };
}
