using System;
using System.CodeDom.Compiler;
using System.ComponentModel;
using System.Diagnostics;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Markup;
using System.Windows.Media;
using System.Windows.Shapes;

namespace StarRatingsControl
{
	// Token: 0x02000013 RID: 19
	public class StarControl : UserControl, IComponentConnector
	{
		// Token: 0x060000F7 RID: 247 RVA: 0x0000371C File Offset: 0x0000191C
		public StarControl()
		{
			base.DataContext = this;
			this.InitializeComponent();
			this.gdStar.Width = 12.0;
			this.gdStar.Height = 12.0;
			this.gdStar.Clip = new RectangleGeometry
			{
				Rect = new Rect(0.0, 0.0, 12.0, 12.0)
			};
			this.mask.Width = 12.0;
			this.mask.Height = 12.0;
		}

		// Token: 0x1700006A RID: 106
		// (get) Token: 0x060000F8 RID: 248 RVA: 0x000037CB File Offset: 0x000019CB
		// (set) Token: 0x060000F9 RID: 249 RVA: 0x000037DD File Offset: 0x000019DD
		public SolidColorBrush BackgroundColor
		{
			get
			{
				return (SolidColorBrush)base.GetValue(StarControl.BackgroundColorProperty);
			}
			set
			{
				base.SetValue(StarControl.BackgroundColorProperty, value);
			}
		}

		// Token: 0x060000FA RID: 250 RVA: 0x000037EB File Offset: 0x000019EB
		private static void OnBackgroundColorChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
		{
			StarControl starControl = (StarControl)d;
			starControl.gdStar.Background = (SolidColorBrush)e.NewValue;
			starControl.mask.Fill = (SolidColorBrush)e.NewValue;
		}

		// Token: 0x1700006B RID: 107
		// (get) Token: 0x060000FB RID: 251 RVA: 0x00003820 File Offset: 0x00001A20
		// (set) Token: 0x060000FC RID: 252 RVA: 0x00003832 File Offset: 0x00001A32
		public SolidColorBrush StarForegroundColor
		{
			get
			{
				return (SolidColorBrush)base.GetValue(StarControl.StarForegroundColorProperty);
			}
			set
			{
				base.SetValue(StarControl.StarForegroundColorProperty, value);
			}
		}

		// Token: 0x060000FD RID: 253 RVA: 0x00003840 File Offset: 0x00001A40
		private static void OnStarForegroundColorChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
		{
			((StarControl)d).starForeground.Fill = (SolidColorBrush)e.NewValue;
		}

		// Token: 0x1700006C RID: 108
		// (get) Token: 0x060000FE RID: 254 RVA: 0x0000385E File Offset: 0x00001A5E
		// (set) Token: 0x060000FF RID: 255 RVA: 0x00003870 File Offset: 0x00001A70
		public SolidColorBrush StarOutlineColor
		{
			get
			{
				return (SolidColorBrush)base.GetValue(StarControl.StarOutlineColorProperty);
			}
			set
			{
				base.SetValue(StarControl.StarOutlineColorProperty, value);
			}
		}

		// Token: 0x06000100 RID: 256 RVA: 0x0000387E File Offset: 0x00001A7E
		private static void OnStarOutlineColorChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
		{
			((StarControl)d).starOutline.Stroke = (SolidColorBrush)e.NewValue;
		}

		// Token: 0x1700006D RID: 109
		// (get) Token: 0x06000101 RID: 257 RVA: 0x0000389C File Offset: 0x00001A9C
		// (set) Token: 0x06000102 RID: 258 RVA: 0x000038AE File Offset: 0x00001AAE
		public decimal Value
		{
			get
			{
				return (decimal)base.GetValue(StarControl.ValueProperty);
			}
			set
			{
				base.SetValue(StarControl.ValueProperty, value);
			}
		}

		// Token: 0x06000103 RID: 259 RVA: 0x000038C4 File Offset: 0x00001AC4
		private static void OnValueChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
		{
			d.CoerceValue(StarControl.MinimumProperty);
			d.CoerceValue(StarControl.MaximumProperty);
			StarControl starControl = (StarControl)d;
			if (starControl.Value == 0.0m)
			{
				starControl.starForeground.Fill = Brushes.Gray;
			}
			else
			{
				starControl.starForeground.Fill = starControl.StarForegroundColor;
			}
			int num = (int)(starControl.Value * 12m);
			starControl.mask.Margin = new Thickness((double)num, 0.0, 0.0, 0.0);
			starControl.InvalidateArrange();
			starControl.InvalidateMeasure();
			starControl.InvalidateVisual();
		}

		// Token: 0x06000104 RID: 260 RVA: 0x00003980 File Offset: 0x00001B80
		private static object CoerceValueValue(DependencyObject d, object value)
		{
			StarControl starControl = (StarControl)d;
			decimal num = (decimal)value;
			if (num < starControl.Minimum)
			{
				num = starControl.Minimum;
			}
			if (num > starControl.Maximum)
			{
				num = starControl.Maximum;
			}
			return num;
		}

		// Token: 0x1700006E RID: 110
		// (get) Token: 0x06000105 RID: 261 RVA: 0x000039CB File Offset: 0x00001BCB
		// (set) Token: 0x06000106 RID: 262 RVA: 0x000039DD File Offset: 0x00001BDD
		public decimal Maximum
		{
			get
			{
				return (decimal)base.GetValue(StarControl.MaximumProperty);
			}
			set
			{
				base.SetValue(StarControl.MaximumProperty, value);
			}
		}

		// Token: 0x1700006F RID: 111
		// (get) Token: 0x06000107 RID: 263 RVA: 0x000039F0 File Offset: 0x00001BF0
		// (set) Token: 0x06000108 RID: 264 RVA: 0x00003A02 File Offset: 0x00001C02
		public decimal Minimum
		{
			get
			{
				return (decimal)base.GetValue(StarControl.MinimumProperty);
			}
			set
			{
				base.SetValue(StarControl.MinimumProperty, value);
			}
		}

		// Token: 0x06000109 RID: 265 RVA: 0x00003A18 File Offset: 0x00001C18
		[DebuggerNonUserCode]
		[GeneratedCode("PresentationBuildTasks", "4.0.0.0")]
		public void InitializeComponent()
		{
			if (this._contentLoaded)
			{
				return;
			}
			this._contentLoaded = true;
			Uri uri = new Uri("/Bookworm;component/custcontrol/starcontrol.xaml", UriKind.Relative);
			Application.LoadComponent(this, uri);
		}

		// Token: 0x0600010A RID: 266 RVA: 0x00003A48 File Offset: 0x00001C48
		[DebuggerNonUserCode]
		[GeneratedCode("PresentationBuildTasks", "4.0.0.0")]
		[EditorBrowsable(EditorBrowsableState.Never)]
		void IComponentConnector.Connect(int connectionId, object target)
		{
			switch (connectionId)
			{
			case 1:
				this.gdStar = (Grid)target;
				return;
			case 2:
				this.starForeground = (Path)target;
				return;
			case 3:
				this.mask = (Rectangle)target;
				return;
			case 4:
				this.starOutline = (Path)target;
				return;
			default:
				this._contentLoaded = true;
				return;
			}
		}

		// Token: 0x0400006D RID: 109
		private const int STAR_SIZE = 12;

		// Token: 0x0400006E RID: 110
		public static readonly DependencyProperty BackgroundColorProperty = DependencyProperty.Register("BackgroundColor", typeof(SolidColorBrush), typeof(StarControl), new FrameworkPropertyMetadata(Brushes.Transparent, new PropertyChangedCallback(StarControl.OnBackgroundColorChanged)));

		// Token: 0x0400006F RID: 111
		public static readonly DependencyProperty StarForegroundColorProperty = DependencyProperty.Register("StarForegroundColor", typeof(SolidColorBrush), typeof(StarControl), new FrameworkPropertyMetadata(Brushes.Transparent, new PropertyChangedCallback(StarControl.OnStarForegroundColorChanged)));

		// Token: 0x04000070 RID: 112
		public static readonly DependencyProperty StarOutlineColorProperty = DependencyProperty.Register("StarOutlineColor", typeof(SolidColorBrush), typeof(StarControl), new FrameworkPropertyMetadata(Brushes.Transparent, new PropertyChangedCallback(StarControl.OnStarOutlineColorChanged)));

		// Token: 0x04000071 RID: 113
		public static readonly DependencyProperty ValueProperty = DependencyProperty.Register("Value", typeof(decimal), typeof(StarControl), new FrameworkPropertyMetadata(0m, new PropertyChangedCallback(StarControl.OnValueChanged), new CoerceValueCallback(StarControl.CoerceValueValue)));

		// Token: 0x04000072 RID: 114
		public static readonly DependencyProperty MaximumProperty = DependencyProperty.Register("Maximum", typeof(decimal), typeof(StarControl), new FrameworkPropertyMetadata(1m));

		// Token: 0x04000073 RID: 115
		public static readonly DependencyProperty MinimumProperty = DependencyProperty.Register("Minimum", typeof(decimal), typeof(StarControl), new FrameworkPropertyMetadata(0m));

		// Token: 0x04000074 RID: 116
		internal Grid gdStar;

		// Token: 0x04000075 RID: 117
		internal Path starForeground;

		// Token: 0x04000076 RID: 118
		internal Rectangle mask;

		// Token: 0x04000077 RID: 119
		internal Path starOutline;

		// Token: 0x04000078 RID: 120
		private bool _contentLoaded;
	}
}
