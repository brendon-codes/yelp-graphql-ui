
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

One possible workaround for this is to use the Yelp Fusion or Autocomplete
APIs to get a more permanent identifier for a business.  Perhaps
this solution can be explored at some point in the future.


### Distance Bug

There seems to be a strange bug in the Yelp Graphql API
where the result set will not always respect the distance restriction
in a GraphQL request. It looks like the `Business.distance` field
was only deployed on January 19, 2018, so they are probably still
ironing out some of the problems.

I have filed a bug for this issue here:
https://github.com/Yelp/yelp-fusion/issues/351

There could be a workaround for this which involves tracking
pager information for requests, then tracking different pager
information for display.  This would be somewhat complicated, and
would also cause the total results display number to be incorrect.
