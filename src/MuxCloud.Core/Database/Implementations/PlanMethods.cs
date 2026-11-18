namespace MuxCloud.Core.Database.Implementations
{
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Core.Database.Implementations.Rows;
    using MuxCloud.Core.Database.Interfaces;
    using MuxCloud.Core.Models;

    /// <summary>
    /// Plan data access; plan features live in a child table. Portable SQL; engine differences live in the dialect.
    /// Thread safety: safe to call concurrently.
    /// </summary>
    public class PlanMethods : IPlanMethods
    {
        #region Private-Members

        private readonly DatabaseExecutor _Db;

        #endregion

        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate.
        /// </summary>
        /// <param name="db">Executor.</param>
        /// <exception cref="ArgumentNullException">db is null.</exception>
        public PlanMethods(DatabaseExecutor db)
        {
            ArgumentNullException.ThrowIfNull(db);
            _Db = db;
        }

        #endregion

        #region Public-Methods

        /// <inheritdoc />
        public async Task<Plan> CreateAsync(Plan plan, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(plan);
            List<SqlStatement> statements = new List<SqlStatement> { new SqlStatement(PlanRow.Insert, PlanRow.Parameters(plan)) };
            foreach (PlanFeature feature in plan.Features)
            {
                feature.PlanId = plan.Id;
                statements.Add(new SqlStatement(PlanFeatureRow.Insert, PlanFeatureRow.Parameters(feature)));
            }

            await _Db.ExecuteTransactionAsync(statements, token).ConfigureAwait(false);
            return plan;
        }

        /// <inheritdoc />
        public async Task<Plan?> ReadAsync(string id, CancellationToken token = default)
        {
            Plan? plan = await _Db.QueryFirstAsync("SELECT " + PlanRow.Columns + " FROM plans WHERE id = @id", new SqlParameters().Add("id", id), PlanRow.Map, token).ConfigureAwait(false);
            if (plan != null) plan.Features = await FeaturesAsync(plan.Id, token).ConfigureAwait(false);
            return plan;
        }

        /// <inheritdoc />
        public async Task<Plan?> ReadByCodeAsync(string code, CancellationToken token = default)
        {
            Plan? plan = await _Db.QueryFirstAsync("SELECT " + PlanRow.Columns + " FROM plans WHERE code = @code", new SqlParameters().Add("code", code), PlanRow.Map, token).ConfigureAwait(false);
            if (plan != null) plan.Features = await FeaturesAsync(plan.Id, token).ConfigureAwait(false);
            return plan;
        }

        /// <inheritdoc />
        public async Task<Plan> UpdateAsync(Plan plan, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(plan);
            plan.LastUpdateUtc = DateTime.UtcNow;
            List<SqlStatement> statements = new List<SqlStatement>
            {
                new SqlStatement(PlanRow.Update, PlanRow.Parameters(plan)),
                new SqlStatement("DELETE FROM plan_features WHERE plan_id = @plan_id", new SqlParameters().Add("plan_id", plan.Id))
            };
            foreach (PlanFeature feature in plan.Features)
            {
                feature.PlanId = plan.Id;
                statements.Add(new SqlStatement(PlanFeatureRow.Insert, PlanFeatureRow.Parameters(feature)));
            }

            await _Db.ExecuteTransactionAsync(statements, token).ConfigureAwait(false);
            return plan;
        }

        /// <inheritdoc />
        public async Task<List<Plan>> EnumerateAsync(bool includeInactive, CancellationToken token = default)
        {
            string where = includeInactive ? String.Empty : " WHERE active = @t AND is_public = @t";
            List<Plan> plans = await _Db.QueryAsync("SELECT " + PlanRow.Columns + " FROM plans" + where + " ORDER BY price_cents, code", new SqlParameters().Add("t", true), PlanRow.Map, token).ConfigureAwait(false);
            List<PlanFeature> features = await _Db.QueryAsync("SELECT " + PlanFeatureRow.Columns + " FROM plan_features ORDER BY feature_key", null, PlanFeatureRow.Map, token).ConfigureAwait(false);
            foreach (Plan plan in plans) plan.Features = features.Where(f => f.PlanId == plan.Id).ToList();
            return plans;
        }

        #endregion

        #region Private-Methods

        private Task<List<PlanFeature>> FeaturesAsync(string planId, CancellationToken token)
        {
            return _Db.QueryAsync("SELECT " + PlanFeatureRow.Columns + " FROM plan_features WHERE plan_id = @plan_id ORDER BY feature_key", new SqlParameters().Add("plan_id", planId), PlanFeatureRow.Map, token);
        }

        #endregion
    }
}
