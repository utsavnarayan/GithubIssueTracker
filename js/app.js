/*global $,document,console,angular,localStorage*/
/*jslint for:true*/
/*jslint browser: true*/

var githubApiRoot = "https://api.github.com/";
var githubPageItemsLimit = "100";

var app = angular.module("dashboardHome", []);

// Main controller for handeling the dashboard
app.controller("HomeCtrl", ["fetchAsyncData", "$scope", function(factory, $scope) {
    "use strict";
    $scope.repositoryName = "";
    $scope.isValidRepositoryUrl = false;
    $scope.allIssues = [];
    $scope.KPIs = [{
        title: "Total number of open issues",
        value: 0
    }, {
        title: "Number of open issues that were opened in the last 24 hours",
        value: 0
    }, {
        title: "Number of open issues that were opened more than 24 hours ago but less than 7 days ago",
        value: 0
    }, {
        title: "Number of open issues that were opened more than 7 days ago",
        value: 0
    }];

    // Resets specific KPIs and then sets their value according to the current data
    $scope.updateKPIs = function() {
        // Note: Design pattern: this can be genralized to reset all the KPI's 
        $scope.KPIs[0].value = 0;
        $scope.KPIs[1].value = 0;
        $scope.KPIs[2].value = 0;
        $scope.KPIs[3].value = 0;

        // Iterate over all issues and identidy in which time-period they belong
        // TODO: Moment.js library can be used to standardize this
        angular.forEach($scope.allIssues, function(issue) {
            // Although GitHUb by default returns only open issues, still have a check whether the issue is open or not
            if (issue.state === "open") {
                var issueTime = Date.parse(issue.created_at);
                var last24HoursTime = new Date(new Date().setDate(new Date().getDate() - 1));
                var sevenDaysBack = new Date(new Date().setDate(new Date().getDate() - 7));

                if (issueTime > last24HoursTime) {
                    $scope.KPIs[1].value += 1;
                } else if (issueTime > sevenDaysBack) {
                    $scope.KPIs[2].value += 1;
                } else {
                    $scope.KPIs[3].value += 1;
                }
                $scope.KPIs[0].value += 1;
            }
        });
    };

    // Parse the 'Link' header from a Github API response. Used for getting the URL for next page of results from paginated Github API response
    $scope.parseLinkHeader = function(header) {
        if (header) {
            // Split parts by comma
            var parts = header.split(',');
            var links = {};
            // Parse each part into a named link
            for (var i = 0; i < parts.length; i++) {
                var section = parts[i].split(';');
                if (section.length != 2) {
                    throw new Error("section could not be split on ';'");
                }
                var url = section[0].replace(/<(.)>/, '$1').trim();
                var name = section[1].replace(/rel="(.)"/, '$1').trim();
                links[name] = url;
            }

            return links;
        }
    };

    // Hit a Github issues URL for issues and return the URL for next page of issues
    $scope.getIssues = function(issuesLink) {
        var nextPageLink = "";
        factory.getGitData(issuesLink).success(function(data, status, headers, config) {
            $scope.allIssues = $scope.allIssues.concat(data);
            nextPageLink = headers().link;
        });
        return nextPageLink;
    };

    // Get all issues by recursively hitting a paginated GitHub API
    // Callback is used for recursion till the GitHub API's response doesn't have a link header
    $scope.getAllIssues = function(callback) {
        $scope.allIssues = [];
        var repositoryURL;

        // TODO: Add extra checks to show a warning label in UI/view when the URL is incorrect
        try {
            // Try to parse the URL
            repositoryURL = new URL($scope.repositoryName);
            $scope.isValidRepositoryUrl = true;
        } catch (err) {
            //If error set flag (used for hiding results view)
            console.log(err);
            $scope.isValidRepositoryUrl = false;
        }
        if ($scope.isValidRepositoryUrl) {
            // Built the API URL for fetching issues for a repository
            // Handle the case when entered URL can hae a trailing 
            // TODO: Use some 3rd party library to build clean URLs by default without using custom logic like below
            var rootIssueLink = githubApiRoot + "repos" + repositoryURL.pathname.replace(/\/+$/, "") + "/issues?per_page=" + githubPageItemsLimit;
            var getIssues = function(issueLink, callback) {
                var nextPageLink = "";
                factory.getGitData(issueLink).success(function(data, status, headers, config) {
                    $scope.isValidRepositoryUrl = data.message === "Not Found" ? false : true;
                    $scope.allIssues = $scope.allIssues.concat(data);
                    // The UI will be updated asynchronusly, i.e. as we get successive pages of GitHUb API response we will keep updating the KPIs
                    $scope.updateKPIs();
                    // Parse the response header for next link URL
                    var nextIssueLink = $scope.parseLinkHeader(headers().link);
                    if (nextIssueLink && nextIssueLink["rel=\"next\""]) {
                        var cleanLink = nextIssueLink["rel=\"next\""].slice(1, -1);
                        if (cleanLink !== "") {
                            callback(cleanLink, callback);
                        }
                    }
                });
            };
            getIssues(rootIssueLink, getIssues);
        }
    };
    $scope.getAllIssues();
}]);

// TODO: move this factory to a seaprate file of there are multiple controllers
// Factory to ping a GitHub URL
app.factory("fetchAsyncData", ["$http", function($http) {
    "use strict";

    function getGitData(gitURL) {
        return $http({
            url: gitURL,
            method: "GET"
        });
    }
    return {
        getGitData: getGitData
    };
}]);

// TODO: move this directive to a separate file of there are multiple controllers
// Custom directive for pinging the GitHub API on press of ENTER button on the searchbar
app.directive('updateIssues', function() {
    return function(scope, element, attrs) {
        element.bind("keydown keypress", function(event) {
            // 13 = ENTER KEY
            if (event.which === 13) {
                scope.$apply(function() {
                    scope.$eval(attrs.updateIssues);
                });

                event.preventDefault();
            }
        });
    };
});