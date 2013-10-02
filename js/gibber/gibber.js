(function() {

//"use strict" // can't use strict because eval is used to evaluate user code in the run method 

// TODO: get rid of window object here
window.Gibber = window.G = {
  Presets: {},
  
  LOGARITHMIC : 1,
  LINEAR : 0,
  
  init: function() { 
    $script([
      'external/gibberish.2.0.min', 
      'external/teoria.min',
      'gibber/clock',
      'gibber/audio/theory',
      'gibber/audio/oscillators',
      'gibber/audio/fx',
      'gibber/audio/synths',
      'gibber/audio/bus',      
      'gibber/seq', 
      'gibber/audio/drums',
      'gibber/utilities'], 'gibber', function() {
        
      Gibber.Audio = Gibberish
      
      $.extend( window, Gibber.Busses )       
      $.extend( window, Gibber.Oscillators )
      $.extend( window, Gibber.FX )
      $.extend( window, Gibber.Synths )
      $.extend( window, Gibber.Percussion )      
      
      Gibber.Audio.init()
      Gibber.Audio.Time.export()
      window.sec = window.seconds
      Gibber.Audio.Binops.export()
      
      Gibber.Master = window.Master = Bus().connect( Gibberish.out )
      Master.type = 'Bus'
      $.extend( true, Master, Gibber.ugen )
      Master.fx.ugen = Master

      Gibber.createMappingAbstractions( Master, Gibber.Busses.mappingProperties )
      
      // override so that all ugens connect to Gibber's Master bus by default
      Gibber.Audio.ugen.connect = 
        Gibber.Audio._oscillator.connect =
        Gibber.Audio._synth.connect =
        Gibber.Audio._effect.connect =
        Gibber.Audio._bus.connect =
        Gibber.connect;
        
      Gibber.Audio.defineUgenProperty = Gibber.defineUgenProperty
      
      $script.ready('environment', function() {
        Gibber.Clock.init()
        Gibber.Clock.addMetronome( Gibber.Environment.Metronome )
      })
      
      window.Seq = Gibber.Seq
      window.ScaleSeq = Gibber.ScaleSeq
      window.Rndi = Gibberish.Rndi
      window.Rndf = Gibberish.Rndf      
      window.rndi = Gibberish.rndi
      window.rndf = Gibberish.rndf
           
    })
  },
  
  // override for gibberish method
  defineUgenProperty : function(key, initValue, obj) {
    var isTimeProp = Gibber.Clock.timeProperties.indexOf(key) > -1,
        prop = obj.properties[key] = {
          value:  isTimeProp ? Gibber.Clock.time( initValue ) : initValue,
          binops: [],
          parent : obj,
          name : key,
        },
        mappingName = key.charAt(0).toUpperCase() + key.slice(1);
    
    Object.defineProperty(obj, key, {
      configurable: true,
      get: function() { return prop.value },
      set: function(val) { 
        if( obj[ mappingName] && obj[ mappingName ].mapping ) {
          obj[ mappingName ].mapping.remove( true ) // pass true to avoid setting property inside of remove method
        }

        prop.value = isTimeProp ? Gibber.Clock.time( val ) : val
        
        Gibberish.dirty(obj);
      },
    });

    obj[key] = prop.value
  },
  
  // override for gibberish method
  polyInit : function(ugen) {
    ugen.mod = ugen.polyMod;
    ugen.removeMod = ugen.removePolyMod;
    
    for( var key in ugen.polyProperties ) {
      (function( _key ) {
        var value = ugen.polyProperties[ _key ],
            isTimeProp = Gibber.Clock.timeProperties.indexOf( _key ) > -1

        Object.defineProperty(ugen, _key, {
          get : function() { return value; },
          set : function( val ) { 
            for( var i = 0; i < ugen.children.length; i++ ) {
              ugen.children[ i ][ _key ] = isTimeProp ? Gibber.Clock.time( val ) : val;
            }
          },
        });
        
      })( key );
    }
  },
  
  // override for gibberish method to use master bus
  connect : function( bus ) {
    if( typeof bus === 'undefined' ) bus = Gibber.Master
    
    if( this.destinations.indexOf( bus ) === -1 ){
      bus.addConnection( this, 1 )
      this.destinations.push( bus )
    }
    
    return this
  },

  log: function( msg ) { console.log( msg ) },
  
  run: function( code ) {
		//try {
			eval( code )
      //}catch( e ) {
			//G.log( e. )
      //}
  },
  
  processArguments: function(args, type) {    
    var obj
    
    if( args.length ) {
      if( typeof args[0] === 'string' && type !== 'Drums' && type !== 'XOX' ) {
        obj = Gibber.getPreset( args[0], type )
        
        if( typeof args[1] == 'object' ) {
          $.extend( obj, args[ 1 ] )
        }
        return obj
      }
      return Array.prototype.slice.call(args, 0)
    }
    
    return obj
  },
    
  getPreset: function( presetName, ugenType ) {
    var obj = {}
    
    if( Gibber.Presets[ ugenType ] ) {
      if( Gibber.Presets[ ugenType ][ presetName ] ) {
        obj = Gibber.Presets[ ugenType ][ presetName ]
      }else{
        Gibber.log( ugenType + ' does not have a preset named ' + presetName + '.' )
      }
    }else{
      Gibber.log( ugenType + ' does not have a preset named ' + presetName + '.' )
    }
    
    return obj
  },
  
  stopAudio: function() {    
    Gibberish.analysisUgens.length = 0
    Gibberish.sequencers.length = 0
    
    for( var i = 0; i < Gibber.Master.inputs.length; i++ ) {
      Gibber.Master.inputs[ i ].value.disconnect()
    }
    
    Gibber.Master.inputs.length = 0
    
    Gibber.Clock.start()
  },
  
  clear : function() {
    this.stopAudio();
    
    if( this.Graphics.running ) {
      for( var i = 0; i < this.Graphics.graph.length; i++ ) {
        this.Graphics.graph[ i ].remove( true )
      }
      this.Graphics.graph.length = 0
    }
  },
  
  proxy: function( target ) {
		var letters = "abcdefghijklmnopqrstuvwxyz"
    
		for(var l = 0; l < letters.length; l++) {
			var lt = letters.charAt(l);
      
			(function() {
				var ltr = lt;
      
				Object.defineProperty( target, ltr, {
					get:function() { return target[ '___'+ltr] },
					set:function( newObj ) {
            if( newObj ) {
              if( target[ '___'+ltr ] ) { 
                if( typeof target[ '___'+ltr ].replaceWith === 'function' ) {
                  target[ '___'+ltr ].replaceWith( newObj ) 
                }
              }
              target[ '___'+ltr ] = newObj
            }else{
						  if( target[ '___'+ltr ] ) {
						  	 var variable = target[ '___'+ltr ]
						  	 if( variable ) {
						  		 if( typeof variable.kill === 'function' /*&& target[ '___'+ltr ].destinations.length > 0 */) {
						  			 variable.kill();
						  		 }
						  	 }
						  }
            }
          }
        });
      })();
      
    }
  },

  construct: function( constructor, args ) {
    function F() {
      return constructor.apply( this, args );
    }
    F.prototype = constructor.prototype;
    return new F();
  },
  
  createMappingObject : function(target, from) {
    var min = target.min, max = target.max, _min = from.min, _max = from.max
    
    if( from.targets.indexOf( target ) === -1 ) from.targets.push( [target, target.Name] )
    
    if( target.timescale === 'audio' ) {
      if( from.timescale === 'audio' ) {
        if( from.Name !== 'Amp' ) {
          var proxy = new Gibberish.Proxy2( from.object, from.name )
          target.object[ target.name ] = Map( proxy, target.min, target.max, from.min, from.max )
          target.object[ target.Name ].mapping = target.object[ target.name ]
          
          target.object[ target.Name ].mapping.remove = function( doNotSet ) {
            
            if( !doNotSet ) {
              target.object[ target.name ] = target.object[ target.Name ].mapping.getValue()
            }
            delete target.object[ target.Name ].mapping
          }
          
          target.object[ target.Name ].mapping.replace = function( replacementObject, key ) {
            var proxy = new Gibberish.Proxy2( replacementObject, key )
            target.object[ target.Name ].mapping.input = proxy
            if( replacementObject[ Key ].targets.indexOf( target ) === -1 ) replacementObject[ Key ].targets.push( [target, target.Name] )
          }
        }else{
          target.object[ target.name ] = Map( null, target.min, target.max, 0, 1, 0 )   
          target.object[ target.Name ].mapping = target.object[ target.name ]
          
          target.object[ target.Name ].mapping.follow = new Gibberish.Follow({ input:from.object })
          target.object[ target.Name ].mapping.input = target.object[ target.Name ].mapping.follow
          target.object[ target.Name ].mapping.bus = new Gibberish.Bus2({ amp:0 }).connect()
          target.object[ target.Name ].mapping.connect( target.object[ target.Name ].mapping.bus )
          
          target.object[ target.Name ].mapping.remove = function( doNotSet ) {
            if( !doNotSet ) {
              target.object[ target.name ] = target.object[ target.Name ].mapping.getValue()
            }
            
            if( this.bus )
              this.bus.disconnect()
            
            if( this.follow )  
              this.follow.remove()
            
            delete target.object[ target.Name ].mapping
          }
          target.object[ target.Name ].mapping.replace = function( replacementObject, key, Key  ) {
            target.object[ target.Name ].mapping.follow.input = replacementObject   
            if( replacementObject[ Key ].targets.indexOf( target ) === -1 ) replacementObject[ Key ].targets.push( [target, target.Name] )            
          }
        }
      }else if( from.timescale === 'graphics' ) {
        var proxy = new Gibberish.Proxy2( from.object, from.name ),
            op    = new Gibberish.OnePole({ a0:.005, b1:.995 })
        
        op.smooth( target.name, target.object )

        target.object[ target.name ] = target.object[ target.Name ].mapping = Map( proxy, target.min, target.max, from.min, from.max, target.output, from.wrap ) 

        target.object[ target.Name ].mapping.proxy = proxy
        target.object[ target.Name ].mapping.op = op
        
        target.object[ target.Name ].mapping.remove = function( doNotSet ) {
          if( !doNotSet ) {
            target.object[ target.name ] = target.object[ target.Name ].mapping.getValue()
          }
          
          delete target.object[ target.Name ].mapping
        }
      }
    }else if( target.timescale === 'graphics' ) {

      if( from.timescale === 'audio' ) {
        if( from.Name !== 'Amp' ) {
          target.object[ target.Name ].mapping = Map( null, target.min, target.max, from.min, from.max, target.output, from.wrap )
        
          target.object[ target.Name ].mapping.follow = new Gibberish.Follow({ input:from.object.properties[ from.name ] })
        
          // assign input after Map ugen is created so that follow can be assigned to the mapping object
          target.object[ target.Name ].mapping.input = target.object[ target.Name ].mapping.follow
        
          target.object[ target.Name ].mapping.bus = new Gibberish.Bus2({ amp:0 }).connect()

          target.object[ target.Name ].mapping.connect( target.object[ target.Name ].mapping.bus )
          
          target.object[ target.Name ].mapping.replace = function( replacementObject, key ) {
            var proxy = new Gibberish.Proxy2( replacementObject, key )
            target.object[ target.Name ].mapping.input = proxy
            if( replacementObject[ Key ].targets.indexOf( target ) === -1 ) replacementObject[ Key ].targets.push( [target, target.Name] )
          }
        }else{
          target.object[ target.Name ].mapping = Map( null, target.min, target.max, 0, 1, 0 )   
          target.object[ target.Name ].mapping.follow = new Gibberish.Follow({ input:from.object })
          target.object[ target.Name ].mapping.input = target.object[ target.Name ].mapping.follow
          target.object[ target.Name ].mapping.bus = new Gibberish.Bus2({ amp:0 }).connect()
          target.object[ target.Name ].mapping.connect( target.object[ target.Name ].mapping.bus )
          
          target.object[ target.Name ].mapping.replace = function( replacementObject, key, Key  ) {
            target.object[ target.Name ].mapping.follow.input = replacementObject   
            if( replacementObject[ Key ].targets.indexOf( target ) === -1 ) replacementObject[ Key ].targets.push( [target, target.Name] )            
          }
        }
        
        target.object[ target.Name ].mapping.remove = function() {
          this.bus.disconnect()
          this.follow.remove()
          
          if( target.object.mod ) {
            target.object.removeMod( target.name )
          }else{
            target.modObject.removeMod( target.modName )
          }
          
          delete target.object[ target.Name ].mapping
        }
        
        if( target.object.mod ) { // second case accomodates modding individual [0][1][2] properties fo vectors
          target.object.mod( target.name, target.object[ target.Name ].mapping, '=' )
        }else{
          target.modObject.mod( target.modName, target.object[ target.Name ].mapping, '=' )
        }
      }else if( from.timescale === 'graphics' ) {
        // rewrite getValue function of Map object to call Map callback and then return appropriate value
        var map = Map( from.object[ from.name ], target.min, target.max, from.min, from.max, target.output, from.wrap ),
            old = map.getValue.bind( map )
        
        map.getValue = function() {
          map.callback( from.object[ from.name ], target.min, target.max, from.min, from.max, target.output, from.wrap )
          return old()
        }
        
        target.object[ target.Name ].mapping = map
        target.object.mod( target.name, target.object[ target.Name ].mapping, '=' )
        
        target.object[ target.Name ].mapping.remove = function() {
          if( target.object.mod ) {
            target.object.removeMod( target.name )
          }else{
            target.modObject.removeMod( target.modName )
          }
          target.object[ target.name ] = target.object[ target.Name ].mapping.getValue()
          
          delete target.object[ target.Name ].mapping
        }
        
        target.object[ target.Name ].mapping.replace = function( replacementObject, key, Key  ) {
          target.object[ target.Name ].mapping.input = replacementObject   
          if( replacementObject[ Key ].targets.indexOf( target ) === -1 ) replacementObject[ Key ].targets.push( [target, target.Name] )            
        }
      }
    } 
    
    Object.defineProperties( target.object[ target.Name ], {
      'min' : {
        get : function() { return min },
        set : function(v) { min = v;  target.object[ target.Name ].mapping.outputMin = min }
      },
      'max' : {
        get : function() { return max },
        set : function(v) { max = v; target.object[ target.Name ].mapping.outputMax = max }
      },
    })
    
    Object.defineProperties( from.object[ from.Name ], {
      'min' : {
        get : function() { return _min },
        set : function(v) { _min = v; target.object[ target.Name ].mapping.inputMin = _min }
      },
      'max' : {
        get : function() { return _max },
        set : function(v) { _max = v; target.object[ target.Name ].mapping.inputMax = _max }
      },
    })
    
  },
  
  createMappingAbstractions : function( obj, mappingProperties) {
    obj.mappingProperties = mappingProperties
    obj.mappingObjects = []
    
    for( var key in mappingProperties ) {
      (function() {
        var property = key,
            prop = mappingProperties[ property ],
            mapping = $.extend( {}, prop, {
              Name  : property.charAt(0).toUpperCase() + property.slice(1),
              name  : property,
              type  : 'mapping',
              value : obj[ property ],
              object: obj,
              targets: []
            }),
            oldSetter = obj.__lookupSetter__( property )
        
        obj.mappingObjects.push( mapping )
        
        Object.defineProperty( obj, mapping.Name, {
          configurable: true,
          get : function()  { return mapping },
          set : function( v ) {
//          console.log(" MAPPING SOMETHING ")
            obj[ mapping.Name ] = v
          }
        })
        
//        console.log( mappingProperties )
        Object.defineProperty( obj, property, {
          get : function() { return mapping.value },
          set : function( v ) {
            if( typeof v === 'object' && v.type === 'mapping' ) {
              Gibber.createMappingObject( mapping, v )
            }else{
              mapping.value = v
              //console.log( "MAPPING NAME : " + obj[ mapping.Name.mapping ] )
              if( typeof obj[ mapping.Name.mapping ] !== 'undefined' ) obj[ mapping.Name.mapping ].remove()
              oldSetter.call( obj, mapping.value )
            }
          }
        })
      })()
    } 
  },
  
  ugen: {
    sequencers : [],
    fx: $.extend( [], {
      add: function() {
        var end = this.length === 0 ? this.ugen : this[ this.length - 1 ]
        
        end.disconnect()
        
        for( var i = 0; i < arguments.length; i++ ) {
          var fx = arguments[ i ]
          fx.input = end
          
          end = fx
          
          this.push( fx )
        }
        
        if( this.ugen !== Master ) {
          end.connect()
        }else{
          end.connect( Gibberish.out )
        }
                
        return this.ugen
      },
      
      remove: function() {
        if( arguments.length > 0 ) {
          for( var i = 0; i < arguments.length; i++ ) {
            var arg = arguments[ i ];
            if( typeof arg === 'number' ) {
              this.splice( arg, 1 )
              if( typeof this[ arg ] !== 'undefined') {
                if( typeof this[ arg + 1 ] !== 'undefined' ) { // if there is another fx ahead in chain...
                  this[ arg + 1 ].input = this[ arg ]
                }else{
                  if( this.ugen !== Master ) {
                    this.ugen.connect( Gibber.Master )
                  }else{
                    this.ugen.connect( Gibberish.out )
                  }
                }
              }else{
                if( this.length > 0 ) { // if there is an fx behind in chain
                  this[ arg - 1 ].connect( Gibber.Master )
                }else{
                  if( this.ugen !== Master ) {
                    this.ugen.connect( Gibber.Master ) // no more fx
                  }else{
                    this.ugen.connect( Gibberish.out )
                  }
                }
              }
            }
          }
        }else{
          if( this.length > 0) {
            this[ this.length - 1 ].disconnect()
            if( this.ugen !== Master ) {
              this.ugen.connect( Gibber.Master )
            }else{
              this.ugen.connect( Gibberish.out )
            }
            this.ugen.codegen()
            this.length = 0
          }else{
            Gibber.log( this.ugen.name + ' does not have any fx to remove. ')
          }
        }
      },
    }),
    
    replaceWith: function( replacement ) {
      for( var i = 0; i < this.destinations.length; i++ ) {
        replacement.connect( this.destinations[i] )
      }
      
      for( i = 0; i < this.sequencers.length; i++ ) {
        this.sequencers[ i ].target = replacement
        replacement.sequencers.push( this.sequencers[i] )
      }
      
      for( i = 0; i < this.mappingObjects.length; i++ ) {
        var mapping = this.mappingObjects[ i ]

        if( mapping.targets.length > 0 ) {
          for( var j = 0; j < mapping.targets.length; j++ ) {
            var _mapping = mapping.targets[ j ]
            
            if( replacement.mappingProperties[ mapping.name ] ) {
              _mapping[ 0 ].mapping.replace( replacement, mapping.name, mapping.Name )
            }else{ // replacement object does not have property that was assigned to mapping
              _mapping[ 0 ].mapping.remove()
            }
          }
        }
      }
      
      this.kill()
    },
    
    kill: function() { 
      var end = this.fx.length !== 0 ? this.fx[ this.fx.length - 1 ] : this
      end.disconnect()
    },
  },
}

})()
