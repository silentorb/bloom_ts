var Slider = Bloom.List.sub_class('Slider', {
  initialize: function() {
    this.width = parseInt(this.element.css('padding-left')) + parseInt(this.element.css('padding-right'));
    this.element.width(this.width);
    this.position = 0;
    //    if (this.seed.is_meta_object) {
    //      this.watch_seed();
    //    }
    var self = this;

  },
  back: function(amount) {
    if (this.position === 0)
      return;

    this.position -= Math.min(amount || 1, this.position);

    this.update_position(true);
  },
  calculate_width: function() {
    var children = this.children;
    this.width = parseInt(this.element.css('padding-left')) + parseInt(this.element.css('padding-right'));

    for (var x = 0; x < children.length; x++) {
      var element = children[x].element;
      this.width += element.parent().outerWidth();  
    //          if (flower.element[0].nodeName.toLowerCase() == 'li')
    //      this.width += flower.element.outerWidth();    
    //    else 
    //      this.width += flower.element.parent().outerWidth();
    //    this.element.width(this.width);     
    }
    this.element.width(this.width);
  },
  child_connected: function(flower) {
    Bloom.List.methods.child_connected.call(this, flower);
    this.calculate_width();
  },
  get_offset: function() {
    var flower = this.children[this.position];    
    return -(flower.element.parent().position().left - parseInt(this.element.css('margin-left')));
  },
  forward: function(amount) {
    if (this.position == this.seed.length - 1)
      return;

    this.position += Math.min(amount || 1, this.seed.length - this.position);
    this.update_position(true);
  },
  set_position: function(destination) {
    if (typeof destination == 'number') {
      this.position = destination;
    }
    else {
      var x = this.seed.indexOf(destination);
      if (x == -1)
        return;
      this.position = x;
    }

    this.update_position();
  },
  set_navigation_buttons: function(left, right) {
    this.left_button = left;
    this.right_button = right;
    
    var self = this;
    left.click(function() {
      self.back();
    });
    right.click(function() {
      self.forward();
    });
  },
  update_position: function(animate) {
    if (animate) {
      this.element.animate({
        marginLeft: this.get_offset()
      });
    }
    else {
      this.element.css('margin-left', this.get_offset());
    }
    
    if (this.children.length < 2) {
      this.left_button.hide();
      this.right_button.hide();
    }
    else {
      if (this.position == 0) {
        this.left_button.hide();
      }
      else {
        this.left_button.show();
      }
      
      if (this.position == this.children.length - 1) {
        this.right_button.hide();
      }
      else {
        this.right_button.show();
      }
    }
    
    this.invoke('move', this.position, this);
  }  
});
