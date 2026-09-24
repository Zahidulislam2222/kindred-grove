'use strict';

process.stderr.write(
  'Theme deployment is blocked: no automated remote drift comparison and post-deploy parity proof are implemented. Complete and review that release gate before enabling any Shopify theme write.\n',
);
process.exitCode = 1;
