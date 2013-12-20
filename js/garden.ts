/// <reference path="../defs/jquery.d.ts" />
/// <reference path="../defs/metahub.d.ts" />
/// <reference path="../defs/handlebars.d.ts" />
/// <reference path="../defs/when.d.ts" />

import MetaHub = require('metahub')
import Handlebars = require('handlebars')
import when = require('when')
import Bloom = require('bloom')

declare var APP_PATH:string;

module Garden {

  export class App {
    page_blocks = {}
    config:IGarden_Config
    queries
    current_path:string[] = []
    query_service_url:string = ''

    load():Promise {
      var def = when.defer()
      jQuery.get(Bloom.join(APP_PATH, this.config.block_path), (response) => {
        Bloom.Block.load_blocks_from_string(response)
        for (var i in Bloom.Block.blocks) {
          var block = Bloom.Block.blocks[i]
          if (block['page-title'])
            this.page_blocks[i] = block
        }
        def.resolve()
      }, 'text')
      return def.promise
    }

    run() {
      this.start_app()
        .then(()=> {
          this.initialize_routes()
        })
    }

    initialize_routes() {

    }

    run_query(name:string, args = {}):Promise {
      var query = this.queries[name]
      if (!query)
        throw new Error('Could not find query: "' + name + '".')

      if (typeof query === 'object') {
        var data = JSON.stringify(query)
        for (var i in args) {
          data = data.replace(new RegExp(i, 'g'), args[i])
        }
        var url = query.url || this.query_service_url
        return Bloom.ajax(url + '?XDEBUG_SESSION_START=netbeans-xdebug', {
          data: data,
          type: "POST"
        })
      }

      if (typeof query === 'string') {
        return Bloom.ajax(query.url, {
          type: "GET"
        })
      }

      throw new Error('Invalid query type.')
    }

    get_current_path() {
      switch (this.config.navigation_mode) {
        case Navigation_Mode.path:
          return window.location.pathname.substr(APP_PATH.length + 1) || 'index'
        case Navigation_Mode.hash:
          return location.hash || 'index'
          break
      }

      return null
    }

    navigate(url) {
//    var url = this.get_current_path()
      if (Bloom.Block.get_block(url)) {
        this.get_view_chain(url)
          .then((views)=> this.update_page(views))
      }
      else {
        this.not_found()
      }
    }

    not_found():Promise {
      return this.get_view_chain('404')
        .then((views)=> this.update_page(views))
    }

    get_block(path):Promise {
      var block = Bloom.Block.get_block(path)
      if (block)
        // Pass true to 'skip_query' to avoid redundant/premature loading of data.
        return Bloom.Block.render_block(block, {})
      else
        return when.resolve()
    }

    get_view_chain(url:string):Promise {
      var path = Bloom.Irrigation.path_array(url), path_step = ''

      var page_block = Bloom.Block.get_block(url)
      if (page_block && page_block['page-title'] && page_block['default'])
        path.push(page_block['default'])

      return when.map(path, (value) => {
        path_step = Bloom.join(path_step, value)
        return this.get_block(path_step).then((view)=> {
          return {
            view: view,
            token: value,
            seed: {}
          }
        })
      })
        .then((views)=> views.filter((x)=> x.view))
    }

    public render_view(views, i, last_view = null, plot = null):Promise {
      if (i >= views.length)
        return when.resolve(views[views.length - 1].view)

      var view = views[i].view, token = views[i].token
      var path_array = views.slice(0, i + 1).map((view)=>view.token)

      if (!view || compare_arrays(this.current_path.splice(0, i + 1), path_array)) {
        return this.render_view(views, i + 1, last_view, plot)
      }

      var parent_path = path_array.slice(0, i).join('/')
      if (last_view)
        plot = this.get_plot(parent_path, last_view)
      else
        plot = this.get_plot(parent_path)

      if (plot.length === 0)
        throw new Error('Could not find plot')

      return Bloom.Block.grow(view, views[i].seed)
        .then((view)=> {
          if (last_view) {
            plot.empty()
            plot.append(view)
          }
          else {
            this.transition(plot, view)
          }

          last_view = view
          return this.render_view(views, i + 1, last_view, plot)
        })
    }

    start_app():Promise {
      return Bloom.Block.grow('garden', this)
        .then((garden:JQuery)=> {
          this.get_plot('root').append(garden)
          var self = this
          garden.on('click', 'a', function (e) {
            e.preventDefault()
            var url = $(this).attr('href')
            // Someday I may come across an exception, but every case I can think of,
            // external links will always have a dot and local links never will.
            if (url.indexOf('.') > -1) {
              var win = window.open(url, '_blank');
              win.focus();
            }
            else {
              self.navigate(url);
            }
          })

          this.navigate('top-tapz')
        })
    }

    update_page(views, title:string = null) {
      console.log(this.current_path, views)
      this.render_view(views, 0)
        .then((view)=> {
          this.update_title(view, title)
          var path = []
          for (var i = 0; i < views.length; ++i) {
            if (views[i].view)
              path.push(views[i].token)
          }
          this.current_path = path
        })
    }

    update_title(view, title) {
      // Grab title from last view in the path list
      var full_title = 'Tapz Store'
      if (title)
        full_title += ' - ' + block_title
      else {
        var block_title = view.attr('page-title')
        if (block_title)
          full_title += ' - ' + block_title
      }
      window.document.title = full_title
    }

    get_plot(path, element = null):JQuery {
      element = element || $('body')
      path = path || '/'
      return element.find('garden-plot[path="' + path + '"]')
    }

    transition(plot, view) {
      if (plot.children().length) {
        $("html, body").animate({ scrollTop: 0 }, "slow");
        plot.children().fadeOut(()=> {
          plot.empty()
          plot.append(view)
          view.hide()
          view.fadeIn()
        })
      }
      else {
        // I still call empty() just in case there's some non-children details I'm overlooking.
        plot.empty()
        plot.hide()
        plot.append(view)
        plot.fadeIn()
      }
    }
  }

  export function compare_arrays(first, second):boolean {
    if (typeof first !== 'object' || typeof second !== 'object' || first.length !== second.length)
      return false

    for (var i = 0; i < first.length; ++i) {
      if (first[i] !== second[i])
        return false
    }

    return true
  }


  export interface IGarden_Config {
    block_path:string
    navigation_mode:Navigation_Mode
  }

  export enum Navigation_Mode {
    path,
    hash
  }
}

export = Garden