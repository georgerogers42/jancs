"use strict";
var _ = require("underscore");
var A = require("async");

var thunk = exports.thunk = function(f) {
	var res, err, bound;
	return function(cb) {
		if(bound) return Process.nextTick(cb.bind(null, err, res));
		return f.call(this, function(e, r) {
			err = e;
			res = r;
			bound = true;
			return cb(err, res);
		});
	};
};

var Build = exports.Build = function() {
	this.tasks = Object.create(null);
	this.rules = [];
};

Build.prototype.lookupTask = function(name) {
	var task;
	if(task = this.tasks[name]) return task;
};

Build.prototype.lookupRule = function(name) {
	var n;
	n = _.findIndex(this.rules, function(rule) {
		return rule[0].test(name);
	});
	if(n >= 0) return this.rules[n][1];
};

Build.prototype.exec = function(name, cb) {
	var task, rule;
	if(task = this.lookupTask(name)) {
		return task.exec(cb);
	} else if(rule = this.lookupRule(name)) {
		rule.exec(name, cb);
	} else {
		throw new Error("No such rule");
	}
};

Build.prototype.task = function(name, prereqs, fn) {
	return this.tasks[name] = new Task(this, name, prereqs, fn);
};

Build.prototype.rule = function(name, prereqs, fn) {
	var rule = new Rule(this, name, prereqs, fn);
	this.rules.push([name, rule]);
	return rule;
}

Build.prototype.complete = function() {
	this.rules = this.rules.reverse();
};

var Task = exports.Task = function(build, name, prereqs, fn) {
	this.build = build;
	this.name = name;
	this.prereqs = thunk(prereqs.bind(this));
	this.body = thunk(fn.bind(this));
};

Task.prototype.exec = function(cb) {
	var self = this;
	A.each(self.prereqs(), function(prereq, cb) {
		self.build.exec(prereq, cb);
	}, function(err) {
		return self.body(cb);
	});
};

var Rule = exports.Rule = function(build, name, prereqs, fn) {
	this.build = build;
	this.name = name;
	this.prereqs = prereqs;
	this.body = fn;
};

Rule.prototype.exec = function(name, cb) {
	this.build.task(name, this.prereqs, this.body).exec(cb);
};
