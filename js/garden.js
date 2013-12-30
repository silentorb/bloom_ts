define(["require", "exports", 'metahub', 'handlebars', 'when', 'bloom'], function(require, exports, __MetaHub__, __Handlebars__, __when__, __Bloom__) {
    var MetaHub = __MetaHub__;
    var Handlebars = __Handlebars__;
    var when = __when__;
    var Bloom = __Bloom__;

    var Garden;
    (function (Garden) {
        var App = (function () {
            function App() {
                this.page_blocks = {};
                this.current_path = [];
                this.query_service_url = '';
            }
            App.prototype.load = function () {
                var _this = this;
                var def = when.defer();
                jQuery.get(Bloom.join(APP_PATH, this.config.block_path), function (response) {
                    Bloom.Block.load_blocks_from_string(response);
                    for (var i in Bloom.Block.blocks) {
                        var block = Bloom.Block.blocks[i];
                        if (block['page-title'])
                            _this.page_blocks[i] = block;
                    }
                    def.resolve();
                }, 'text');
                return def.promise;
            };

            App.prototype.run = function () {
                var _this = this;
                this.start_app().then(function () {
                    _this.initialize_routes();
                });
            };

            App.prototype.initialize_routes = function () {
            };

            App.prototype.run_query = function (name, args) {
                if (typeof args === "undefined") { args = {}; }
                var query = this.queries[name];
                if (!query)
                    throw new Error('Could not find query: "' + name + '".');

                if (typeof query === 'object') {
                    var data = JSON.stringify(query);
                    for (var i in args) {
                        data = data.replace(new RegExp(i, 'g'), args[i]);
                    }
                    var url = query.url || this.query_service_url;
                    return Bloom.ajax(url + '?XDEBUG_SESSION_START=netbeans-xdebug', {
                        data: data,
                        type: "POST"
                    });
                }

                if (typeof query === 'string') {
                    return Bloom.ajax(query.url, {
                        type: "GET"
                    });
                }

                throw new Error('Invalid query type.');
            };

            App.prototype.get_current_path = function () {
                switch (this.config.navigation_mode) {
                    case Navigation_Mode.path:
                        return window.location.pathname.substr(APP_PATH.length + 1) || 'index';
                    case Navigation_Mode.hash:
                        return location.hash || 'index';
                        break;
                }

                return null;
            };

            App.prototype.navigate = function (url) {
                var _this = this;
                if (Bloom.Block.get_block(url)) {
                    this.get_view_chain(url).then(function (views) {
                        return _this.update_page(views);
                    });
                } else {
                    this.not_found();
                }
            };

            App.prototype.not_found = function () {
                var _this = this;
                return this.get_view_chain('404').then(function (views) {
                    return _this.update_page(views);
                });
            };

            App.prototype.get_block = function (path) {
                var block = Bloom.Block.get_block(path);
                if (block)
                    return Bloom.Block.render_block(block, {});
else
                    return when.resolve();
            };

            App.prototype.get_view_chain = function (url) {
                var _this = this;
                var path = Bloom.Irrigation.path_array(url), path_step = '';

                var page_block = Bloom.Block.get_block(url);
                if (page_block && page_block['page-title'] && page_block['default'])
                    path.push(page_block['default']);

                return when.map(path, function (value) {
                    path_step = Bloom.join(path_step, value);
                    return _this.get_block(path_step).then(function (view) {
                        return {
                            view: view,
                            token: value,
                            seed: {}
                        };
                    });
                }).then(function (views) {
                    return views.filter(function (x) {
                        return x.view;
                    });
                });
            };

            App.prototype.render_view = function (views, i, last_view, plot) {
                if (typeof last_view === "undefined") { last_view = null; }
                if (typeof plot === "undefined") { plot = null; }
                var _this = this;
                if (i >= views.length)
                    return when.resolve(views[views.length - 1].view);

                var view = views[i].view, token = views[i].token;
                var path_array = views.slice(0, i + 1).map(function (view) {
                    return view.token;
                });

                if (!view || compare_arrays(this.current_path.splice(0, i + 1), path_array)) {
                    return this.render_view(views, i + 1, last_view, plot);
                }

                var parent_path = path_array.slice(0, i).join('/');
                if (last_view)
                    plot = this.get_plot(parent_path, last_view);
else
                    plot = this.get_plot(parent_path);

                if (plot.length === 0)
                    throw new Error('Could not find plot');

                return Bloom.Block.grow(view, views[i].seed).then(function (view) {
                    if (last_view) {
                        plot.empty();
                        plot.append(view);
                    } else {
                        _this.transition(plot, view);
                    }

                    last_view = view;
                    return _this.render_view(views, i + 1, last_view, plot);
                });
            };

            App.prototype.start_app = function () {
                var _this = this;
                return Bloom.Block.grow('garden', this).then(function (garden) {
                    _this.get_plot('root').append(garden);
                    var self = _this;
                    garden.on('click', 'a', function (e) {
                        e.preventDefault();
                        var url = $(this).attr('href');

                        if (url.indexOf('.') > -1) {
                            var win = window.open(url, '_blank');
                            win.focus();
                        } else {
                            self.navigate(url);
                        }
                    });

                    _this.navigate('top-tapz');
                });
            };

            App.prototype.update_page = function (views, title) {
                if (typeof title === "undefined") { title = null; }
                var _this = this;
                console.log(this.current_path, views);
                this.render_view(views, 0).then(function (view) {
                    _this.update_title(view, title);
                    var path = [];
                    for (var i = 0; i < views.length; ++i) {
                        if (views[i].view)
                            path.push(views[i].token);
                    }
                    _this.current_path = path;
                });
            };

            App.prototype.update_title = function (view, title) {
                var full_title = 'Tapz Store';
                if (title)
                    full_title += ' - ' + block_title;
else {
                    var block_title = view.attr('page-title');
                    if (block_title)
                        full_title += ' - ' + block_title;
                }
                window.document.title = full_title;
            };

            App.prototype.get_plot = function (path, element) {
                if (typeof element === "undefined") { element = null; }
                element = element || $('body');
                path = path || '/';
                return element.find('garden-plot[path="' + path + '"]');
            };

            App.prototype.transition = function (plot, view) {
                if (plot.children().length) {
                    $("html, body").animate({ scrollTop: 0 }, "slow");
                    plot.children().fadeOut(function () {
                        plot.empty();
                        plot.append(view);
                        view.hide();
                        view.fadeIn();
                    });
                } else {
                    plot.empty();
                    plot.hide();
                    plot.append(view);
                    plot.fadeIn();
                }
            };
            return App;
        })();
        Garden.App = App;

        function compare_arrays(first, second) {
            if (typeof first !== 'object' || typeof second !== 'object' || first.length !== second.length)
                return false;

            for (var i = 0; i < first.length; ++i) {
                if (first[i] !== second[i])
                    return false;
            }

            return true;
        }
        Garden.compare_arrays = compare_arrays;

        (function (Navigation_Mode) {
            Navigation_Mode[Navigation_Mode["path"] = 0] = "path";
            Navigation_Mode[Navigation_Mode["hash"] = 1] = "hash";
        })(Garden.Navigation_Mode || (Garden.Navigation_Mode = {}));
        var Navigation_Mode = Garden.Navigation_Mode;
    })(Garden || (Garden = {}));

    
    return Garden;
});
//# sourceMappingURL=garden.js.map
