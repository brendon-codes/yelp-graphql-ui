##
## Ubuntu LTS
##
FROM ubuntu:16.04

##
## Working dir
##
WORKDIR /App

##
## Upgrade
##
RUN apt-get update -y;
RUN apt-get upgrade -y;

##
## Set the proper locale info
##
RUN apt-get install -y locales;
RUN locale-gen en_US.UTF-8;
ENV LANG en_US.UTF-8
ENV LANGUAGE en_US:en
ENV LC_ALL en_US.UTF-8

##
## Add some basic packages
##
RUN apt-get install -y software-properties-common;
RUN apt-get install -y python-software-properties;
RUN apt-get install -y build-essential;

##
## Emacs setup
##
RUN apt-get install -y emacs-nox;

##
## Nginx
##
RUN add-apt-repository ppa:nginx/stable;
RUN apt-get update;
RUN apt-get install -y nginx;
RUN rm -f /etc/nginx/sites-available/default;
RUN mkdir /etc/nginx/inc;
COPY sysconfigs/local/local/etc/nginx/sites-available/default /etc/nginx/sites-available/default
COPY sysconfigs/local/local/etc/nginx/inc/yelp-key.conf /etc/nginx/inc/yelp-key.conf

##
## Node
##
RUN curl -sL https://deb.nodesource.com/setup_8.x | bash
RUN apt-get update;
RUN apt-get install -y nodejs;

##
## Ports
##
EXPOSE 80

##
## Run Commands
##
ENTRYPOINT \
  service nginx start && \
  /bin/bash

