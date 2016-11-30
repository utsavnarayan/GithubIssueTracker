/*global $,document,console,angular,localStorage*/
/*jslint for:true*/
/*jslint browser: true*/

var githubApiRoot = "https://api.github.com/";
var app = angular.module("dashboardHome", []);

app.controller("HomeCtrl", ["fetchAsyncData", "$scope", function (factory, $scope) {
    "use strict";
    $scope.repositoryName = "";
    $scope.isValidRepositoryUrl = false;
    $scope.allIssues = [];
    $scope.KPIs = [
        { title: "Total number of open issues", value: 0 },
        { title: "Number of open issues that were opened in the last 24 hours", value: 0 },
        { title: "Number of open issues that were opened more than 24 hours ago but less than 7 days ago", value: 0 },
        { title: "Number of open issues that were opened more than 7 days ago", value: 0 }
    ];

    $scope.updateKPIs = function () {
        $scope.KPIs[0].value = 0;
        $scope.KPIs[1].value = 0;
        $scope.KPIs[2].value = 0;
        $scope.KPIs[3].value = 0;
        angular.forEach($scope.allIssues, function (issue) {
            if (issue["state"] === "open") {
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
    }

    $scope.parseLinkHeader = function (header) {
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
    }

    $scope.getIssues = function (issuesLink) {
        var nextPageLink = "";
        factory.getGitData(issuesLink).success(function (data, status, headers, config) {
            $scope.allIssues = $scope.allIssues.concat(data);
            nextPageLink = headers()['link'];
        });
        return nextPageLink;
    }

    $scope.getAllIssues = function (callback) {
        $scope.allIssues = [];
        try {
            var repositoryURL = new URL($scope.repositoryName);
            $scope.isValidRepositoryUrl = true;
        } catch (err) {
            console.log(err);
            $scope.isValidRepositoryUrl = false;
        }
        if ($scope.isValidRepositoryUrl) {
            var rootIssueLink = githubApiRoot + "repos" + repositoryURL.pathname + "/issues?per_page=10";
            var getIssues = function (issueLink, callback) {
                var nextPageLink = "";
                factory.getGitData(issueLink).success(function (data, status, headers, config) {
                    $scope.isValidRepositoryUrl = data.message === "Not Found" ? false : true;
                    $scope.allIssues = $scope.allIssues.concat(data);
                    $scope.updateKPIs();
                    var nextIssueLink = $scope.parseLinkHeader(headers()['link']);
                    if (nextIssueLink && nextIssueLink["rel=\"next\""]) {
                        var cleanLink = nextIssueLink["rel=\"next\""].slice(1, -1);
                        if (cleanLink != "") {
                            callback(cleanLink, callback);
                        }
                    }
                });
            }
            getIssues(rootIssueLink, getIssues);
        }
    };
    $scope.getAllIssues();
}]);

app.factory("fetchAsyncData", ["$http", function ($http) {
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

app.directive('updateIssues', function () {
    return function (scope, element, attrs) {
        element.bind("keydown keypress", function (event) {
            if (event.which === 13) {
                scope.$apply(function () {
                    scope.$eval(attrs.updateIssues);
                });

                event.preventDefault();
            }
        });
    };
});