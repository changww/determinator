# determinator
algorithm for stacking and ordering risk based on capacity of oversight groups

This comes from an application we built for an office in Department of Education. The files included are just the server side javascript
to demonstrate the algorithm. The office was rating riskiness of grantees then was required to place them under levels of monitoring
based upon their riskiness. However, it wasn't just a straight scoring rank, there were business capacity aspects to the ranking. There were
four domains associated with four different monitoring groups. Each group had only so much capacity to monitor grantees at specific levels.
Additonally, the grantees could only handel so much monitoring before the work became counterproductive. The algorithm balances these aspects
and uses a waterfall method to rank and assign monitoring levels to each grantee.

The application was built as a custom app on ServiceNow. You will notice specific methods they use for querying tables and aggregating data.
The first part pulls the scoring data and normalizes the scores for comparison across the domains.
The second part aggregates the scores across the domains.
The third part runs the waterfall (and the core of the algorithm)

There is other stuff in here. I honestly don't remember everything I did here but its about time I documented at least some.

Here is the algorithm:
1. 
