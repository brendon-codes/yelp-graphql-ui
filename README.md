# Yelp Application

Author: Brendon Crawford <brendon@aphex.io>


## About

This repo is a proof of concept application frontend application for
using the Yelp GRaphQL API to present a basic UI for searching
local busineses.

The application is built on React + Webpack within a Docker container,
which serves assets and proxies network requests from Nginx.
Code is written in FlowType+ES6.  Tests are in Jest+Enzyme.  Code linting
is done with ESLint.


## Supported Platforms

This application has been tested on the following host platforms:

- Fedora 27, Docker v1.13.1 (API v1.26)
- OSX 10.12.6, Docker v17.12.0-ce (API v1.35)

This application has been tested in the following browsers:

- Chrome 63.0.3239.132 64bit, Fedora 27
- Chrome 63.0.3239.132 64bit, OSX 10.12.6
- Safari 11.0.3 64bit, OSX 10.12.6
- Firefox 57.0.4 64bit, Fedora 27


## Quick Setup

The first step is to make sure you have Docker installed.
If you do not, you should do that, then come back to here.

Next step is to get your Yelp GraphQL API key:

1. Log into to Yelp
2. Go here: https://www.yelp.com/developers/v3/manage_app
3. You should see a disabled/readonly input under the label
   "API Key".  The text in that input should have a length of 128
   characters.  It seems that in FireFox, you cannot actually copy
   the text, so you need to either get it in Chrome, or view the source.

Now, the rest of the setup process should be pretty easy.  From the
root of the `dsyelp` repo, run this:

```shell
./run
```

If you are on a Linux host, you might be asked to enter your sudo password
a few times.  This is because on most Linux distros, by default, Docker will
require sudo.  So, make sure to pay attention to the build process,
so that the sudo prompt doesn't time out.
But, if you are on OSX, it should be able to run without sudo.

The `run` script will provision the docker image and start the container.
Once the container is running and ready to go, you should see:

```
** Application ready
**
** You should now be able to browse
** the site from your host/desktop browser
** by visiting http://localhost:9191/
**
** Now tailing the Nginx webserver logs
** Press Ctrl+C to shutdown and remove the container
```

If you see that message, then everything is ready to go.  You should
then be able to open http://localhost:9191/ in your web browser.
The port `9191` is used instead of default port `80`, so that there
would not be a possible conflict with other services you might
already have running on your host.

Once you are done using the application, you can hit `Ctrl+c`.
This will stop the container, and remove the container.
However, it will not remove the docker image.  If you want to remove
the docker image, you will need to run:

```shell
./docker-cmd/rm-image
```

If you ever need to run the application again, you can always re-run
the `./run` command.  In future runs, it will not rebuild the entire
docker image, unless you previously deleted the image.  It also
will not ask you again for your Yelp API key, unless you deleted
the yelp api key nginx config file.
However, it will rebuild the npm node modules and the webpack assets.


## Using the Application UI

This is a basic overview of the various UI features.

When you first load the page, it should load a default business listing,
based on a hardcoded zip code and category.  If I had more time, I would
incorporate the geolocation API.  That will require https to be used, and
also mapping geolocation coordinates to zip code.  So, I did not have enough
to implement that right now.

If you click on a table row header title, you will be able to sort the
following fields either ascending or descending:

- Name
- Location
- Miles (Distance)
- Favorite / Not Favorite

The default sort for searching is miles (distance).  The default sort
for viewing all favorites is name.

Please note that images do not always render properly for all business
results.  This seems to be a Yelp bug.

You can set the miles (distance) from 1 - 25.  25 miles is the limit
that Yelp will support.  There is what seems like a bug with how
Yelp deals with distance.  Please see the bugs section below.

You must specify a zip code in order to search.

You can specify an optional category.  If you begin typing, you will
see an autocomplete which will show suggested categories.  As of now, there
are 1538 categories.

You should be able to paginate through results by clicking
"Previous" and "Next".  Each page shows 20 results.

You can click on the name of each business to go to the url at Yelp
for that business.

You can click the heart icon for a business to add it to your favorites.
A gray heart means that it is not a favorite.  A red heart means that it is
a favorite.  Your favorites are stored locally, so they should persist on
page load, unless you have a special privacy setting to purge your local IndexedDB
storage on each page load, which is unlikely for most users.

If you click "Show All Favorites", you should be taken to your listing
of all businesses which you have added as favorites.  Due to constraints
of the API, these listings will not show distance, but
with some more time, this ability could probably be added.


## Hacking the Code

Here are some slightly more detailed steps, if you want get into
the internals of the system.  All these commands happen from the
root of the `dsyelp` repo.

If you have not already done so, you should run the setup command from
above:

```shell
./run
```

Then you can exit by hitting `Ctrl+c`.
From this point on, you can do the following any time you want
to work with the code.

First, start/run the container:

```shell
## From host OS
./docker-cmd/start
```

Now, you can connect to the guest OS:

```shell
## From host OS
./docker-cmd/connect
```

You should now be inside the guest OS.  First, go into the project
directory:

```shell
## From guest OS
cd /App/repos/dsyelp/
```

Now, in here you can do whatever you need to do:

Check the nginx logs:

```shell
## From guest OS
tail /var/log/nginx/access.log
```

Run the tests:

```shell
## From guest OS
npm test
```

Run the webpack watcher:

```shell
## From guest OS
npm run webpack-watch
```

If you decide to package the js/css assets for a production use,
make sure you use the correct webpack command:

```shell
## From guest OS
npm run webpack-build
```

Once you exit the guest OS, you can stop and remove the container:

```shell
## From host OS
./docker-cmd/stop
```

If you want to remove the docker image:

```shell
## From host OS
./docker-cmd/rm-image
```


## Yelp Bugs

While working on this application, I cam across a couple of problems
with the Yelp GraphQL API:

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

### ID / Redirect Problem

This might not be considered a bug as much as a design flaw.

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

### Business Listing Images

Images for businesses are not always valid, and do not always load.


## Architecture Notes

### Basic Code / Language

This application was made with FlowType, which in this case mostly
looks like ES6 with types.  Another good option is TypeScript.
Both languages are great, and I don't like to get too dogmatic
about which one is better.  As with a lot of decisions, this should
come down to the best tool for the job.  Sometimes that can mean
working with the tool that plays best with other tools, or sometimes
that can mean using the tool that the team is most proficient in.

On this project, I started out by experimenting with Relay framework.
I also initially started with TypeScript.  But, I ran into some quirks
with getting TypeScript to play nice with Relay.  So, because I was on
a limited schedule, I decided to switch over to FlowType, which was easy
to get working with Relay.

I also used ESLint on this project.  I used it with the recommended style
guide, in addition to adding some of my own strict rules.  I have found
that getting teams and projects to use linters can be valuable.  Creating
code which is consistantly readable by everyone on the team is a great
way to boost long term productivity.  I am not too dogmatic on which
style guides to apply, as long as it is consistant and is used by
everyone.  Readability and consistancy always go hand in hand.

Within my main component code, I documented the methods with
JSDoc doc strings.  This can be helpful for making sense of
functions by other coders.  I did not actually process the docs
into doc files.  If I had more time, I would do this.

### Build / Packaging

This application uses Webpack for building assets, and running the
Linter, and FlowType checking.  Webpack in the past was slow with
confusing configuration, but I find that recent versions have made
good improvements in these areas.

I used NPM for package management.  For this particular project,
I was trying to avoid adding more additional tooling requirements.
However, for complex production systems, I actually am leaning towards
preferring Yarn, as it has some strong technical merits.  For this
project, I did not think those merits were particularily necessary.


### Testing

For testing, I used Jest+Enzyme.  For React applications, this
is generally a good choice, although it is not perfect.  Testing
frontend applications is never simple or easy, so there is no perfect
solution.

Sometimes Enzyme can be a little tricky with different types of React
projects.  Here are a few issues that can come up, not just in this project,
but also in other projects:

- Using `mount` can sometimes be tricky.  In this project, `mount` was
  having problems playing nicely with `React-Autosuggest` as a
  sub-component.  I am sure there is a way to make this work, but
  I could not want to spend too much time on it, due to limited
  schedule.
- Similar to above, using `wrapper.dive()` on sub-components
  can be tricky, depending on how those components are written.
  In this case, I had some problems with this on `React-Autosuggest`.
  Given more time, I could figure it out.
- It is important to allow any async promise code in event handlers to
  resolve.  Once nice way to do this, without creating ugly test code
  is with `async/await`.  This is the way to solve the problem of
  components which get an error when calling `setState` on an
  unmounted component.
- I like to create a wrapper for `setState` which is promise enabled.
  If you are using promises in your code, it is nice to use them
  everywhere and not mix with callbacks.  The benefits of this
  become especially clear when making tests.
- `wrapper.simulate(event)` will not always behave as expected.  This problem
  is fairly well documented in various places on the internet.
  If you have async code in your event handlers, `.simulate()` doesnt
  seem to allow those promises to properly resolve.  So, the workaround
  that I did here is to use `wrapper.props().onEvent(event)`,
  which is a good solution recommended by various people.
- For some reason, in certain situations, just using `wrapper.update()` alone
  or `wrapper.instance().forceUpdate()` alone does not seem
  to always update the DOM.  So, as various other people on the internet
  have mentioned, it is a good idea to call both.


### GraphQL

My experience with GraphQL coming into this project was very small.

My first experiment was to try to integrate Relay.  I was able to get some
basic integration with Yelp, and get my data back.  However, I did find
myself fighting the framework to get everything I needed.  Under normal
circumstances, I would take the time to properly learn the correct idiomatic usage
of the framework, but in this case, I was on a tight schedule, so I had to
move on to another solution which would allow me to get this done.  I still
want to revisit Relay, as I am interested in learning more about it.

Next, I tried Apollo.  However, again,
I realized that I would need to invest time to use it idiomatically.  So,
instead of fighting the framework, due to limited schedule, I decided
to simplify and just use a very simple GraphQL query transport library.
However, I do plan to also revisit Apollo.

I settled on Lokka.  It is basically just a small library which sends
GraphQL queries to a server.  For the purposes of this project, it worked
well, but I could see the potential that on a complex production-quality
project, it could be more beneficial to use a more structured solution.
However, I would need to investigate that question further before making conclusions.
After integrating Lokka, I was able to get the Yelp GraphQL
integration part done fairly quickly at this point.


### Local Favorites Storage

For storing favorites, I determined it would best to use IndexedDB.
It is relatively fast, has good storage size, and can be accessed
asyncronously.  The core IndexedDB api is a mess, so I decided
to use Dexie which provides a nice clean layer on top of it.

In the IndexedDB, it is only storing the Yelp business IDs. It does
not store the entire business object.  This is per the Yelp
guidelines which state that business IDs can be stored indefinitely,
but other data can only be stored for 24 hours.


### Yelp Categories

There were a few possible ways to get the Yelp categories:

- **Yelp Autocomplete Api**

  I did not like this idea.  When used with an autocomplete input,
  the autocomplete results would be too slow.  I really like autocompletes
  to be as responsive as possible.

- **Directly embed category json file into application**

  I decided against this idea for two reasons:

    1. Due to the fact that I don't know
       exactly how often the categories get updated, and I wanted to
       make sure that the application always had the fresh categories
    2. I wanted to build this application in a way that somewhat
       decoupled it from Yelp.  This way, if I wanted to, at some point
       in the future I could more easily hook it up to a different service
       beside the Yelp api.

- **Grabbing category json from Yelp server at page load**

  This was the solution that I decided on.  As mentioned above,
  this allowed me to decouple client from server, so if in the future
  I want to hook this client up to a different service, it would
  be more easy.  Also, it allows the categories to always be fresh.

The categories are displayed using the `React-Autosuggest` component.  I find
this to be a great component for a feature like this.  For storing
the categories, I decided to store them in a trie data structure.  This data
structure can be very good for autocomplete type-as-you-search word lookups.
The worst case complexity for a lookup will be  `O(m)` where `m` is length of string.
For the trie structure, I used the `TrieSearch` npm module.


### Proxying

This application is served up by Nginx webserver.  In addition to serving
up the basic js/css assets, I also decided to proxy any API call to Yelp
through Nginx.  There are three reasons for this:

1. I wanted to decouple the client from the Yelp API service.
   This way, if I decided in the future, I could hook up this client
   app to some other API service (internal or external) without modifying
   the frontend code.

2. I believe it is sub-optimal security practice to store and send
   the Yelp API key directly in the frontend code.  Although the Yelp API
   key itself is probably inconsequantial, it could allow an attacker
   to take the key, and perform abusive operations with it, which could
   maybe have the keyholders account suspended, etc.

   So, to accommodate this, I have included the key into the Nginx config,
   and Nginx inserts the authorization header with the key, for the
   GraphQL requests.

3. As far as I can tell, Yelp does not send the `Access-Control-Allow-Origin`
   header on the GraphQL api.  If you go here:
   https://github.com/Yelp/yelp-api/issues/99#issuecomment-187406811

   You can see this comemnt by a Yelp developer:

   > TL;DR: No CORS is not supported by api.yelp.com

   My guess is that they do not want to support CORS due to the
   possibily security vulnerability of storing and sending API keys
   from the client application.

