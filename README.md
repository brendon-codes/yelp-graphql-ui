
## Yelp Bugs

### ID / Redirect Bug

It seems that the `id`s which are assigned to businesses by Yelp
are not actually static.  They usually take the form of `name-city`.

So, for example, there was is a business called "Billionaire Burger Boyz".
Their `id` previously was: `billionaire-burger-boyz-hawthorne-2`.
It looks like the company changed their city, so the new `id` is now
`billionaire-burger-boyz-los-angeles-5`.

You can see this in action by visiting:
https://www.yelp.com/biz/billionaire-burger-boyz-hawthorne-2
Then you will see it redirect to:
https://www.yelp.com/biz/billionaire-burger-boyz-los-angeles-5

So, this creates a problem for storing favorites data locally.
If a user sets a favorite company, using the `id`, then Yelp
changes that `id` for the business, then there will be a mismatch.

There could be some possible clever workarounds for this, but
the issue seems very rare, and I have limited time, so I decided
to spend my time on more important components of this project.


### Distance Bug

There seems to be a strange bug in the Yelp Graphql API
where the result set will not always respect the distance restriction
in a GraphQL request. It looks like the `Business.distance` field
was only deployed on January 19, 2018, so they are probably still
ironing out some of the problems.

I have filed a bug for this issue here:
https://github.com/Yelp/yelp-fusion/issues/351

Again, there could be some complicated client side workarounds for this,
but I decided to spend my time on more important aspects of
this project, keeping in mind the objective of demonstrating proficiency
in various skillsets.

Until this issue is resolved by Yelp, this UI application will return
businesses which are beyond the specified distance.

