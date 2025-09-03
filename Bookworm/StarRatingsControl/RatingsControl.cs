using System;
using System.CodeDom.Compiler;
using System.ComponentModel;
using System.Diagnostics;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Markup;
using System.Windows.Media;

namespace StarRatingsControl
{
	// Token: 0x02000012 RID: 18
	public class RatingsControl : UserControl, IComponentConnector
	{
		// Token: 0x060000DD RID: 221 RVA: 0x0000316A File Offset: 0x0000136A
		public RatingsControl()
		{
			this.InitializeComponent();
		}

		// Token: 0x17000063 RID: 99
		// (get) Token: 0x060000DE RID: 222 RVA: 0x00003178 File Offset: 0x00001378
		// (set) Token: 0x060000DF RID: 223 RVA: 0x0000318A File Offset: 0x0000138A
		public SolidColorBrush BackgroundColor
		{
			get
			{
				return (SolidColorBrush)base.GetValue(RatingsControl.BackgroundColorProperty);
			}
			set
			{
				base.SetValue(RatingsControl.BackgroundColorProperty, value);
			}
		}

		// Token: 0x060000E0 RID: 224 RVA: 0x00003198 File Offset: 0x00001398
		private static void OnBackgroundColorChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
		{
			foreach (object obj in ((RatingsControl)d).spStars.Children)
			{
				((StarControl)obj).BackgroundColor = (SolidColorBrush)e.NewValue;
			}
		}

		// Token: 0x17000064 RID: 100
		// (get) Token: 0x060000E1 RID: 225 RVA: 0x00003204 File Offset: 0x00001404
		// (set) Token: 0x060000E2 RID: 226 RVA: 0x00003216 File Offset: 0x00001416
		public SolidColorBrush StarForegroundColor
		{
			get
			{
				return (SolidColorBrush)base.GetValue(RatingsControl.StarForegroundColorProperty);
			}
			set
			{
				base.SetValue(RatingsControl.StarForegroundColorProperty, value);
			}
		}

		// Token: 0x060000E3 RID: 227 RVA: 0x00003224 File Offset: 0x00001424
		private static void OnStarForegroundColorChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
		{
			foreach (object obj in ((RatingsControl)d).spStars.Children)
			{
				((StarControl)obj).StarForegroundColor = (SolidColorBrush)e.NewValue;
			}
		}

		// Token: 0x17000065 RID: 101
		// (get) Token: 0x060000E4 RID: 228 RVA: 0x00003290 File Offset: 0x00001490
		// (set) Token: 0x060000E5 RID: 229 RVA: 0x000032A2 File Offset: 0x000014A2
		public SolidColorBrush StarOutlineColor
		{
			get
			{
				return (SolidColorBrush)base.GetValue(RatingsControl.StarOutlineColorProperty);
			}
			set
			{
				base.SetValue(RatingsControl.StarOutlineColorProperty, value);
			}
		}

		// Token: 0x060000E6 RID: 230 RVA: 0x000032B0 File Offset: 0x000014B0
		private static void OnStarOutlineColorChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
		{
			foreach (object obj in ((RatingsControl)d).spStars.Children)
			{
				((StarControl)obj).StarOutlineColor = (SolidColorBrush)e.NewValue;
			}
		}

		// Token: 0x17000066 RID: 102
		// (get) Token: 0x060000E7 RID: 231 RVA: 0x0000331C File Offset: 0x0000151C
		// (set) Token: 0x060000E8 RID: 232 RVA: 0x0000332E File Offset: 0x0000152E
		public float Value
		{
			get
			{
				return (float)base.GetValue(RatingsControl.ValueProperty);
			}
			set
			{
				base.SetValue(RatingsControl.ValueProperty, value);
			}
		}

		// Token: 0x060000E9 RID: 233 RVA: 0x00003341 File Offset: 0x00001541
		private static void OnValueChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
		{
			d.CoerceValue(RatingsControl.MinimumProperty);
			d.CoerceValue(RatingsControl.MaximumProperty);
			RatingsControl.SetupStars((RatingsControl)d);
		}

		// Token: 0x060000EA RID: 234 RVA: 0x00003364 File Offset: 0x00001564
		private static object CoerceValueValue(DependencyObject d, object value)
		{
			RatingsControl ratingsControl = (RatingsControl)d;
			return (float)value;
		}

		// Token: 0x17000067 RID: 103
		// (get) Token: 0x060000EB RID: 235 RVA: 0x00003378 File Offset: 0x00001578
		// (set) Token: 0x060000EC RID: 236 RVA: 0x0000338A File Offset: 0x0000158A
		public int NumberOfStars
		{
			get
			{
				return (int)base.GetValue(RatingsControl.NumberOfStarsProperty);
			}
			set
			{
				base.SetValue(RatingsControl.NumberOfStarsProperty, value);
			}
		}

		// Token: 0x060000ED RID: 237 RVA: 0x0000339D File Offset: 0x0000159D
		private static void OnNumberOfStarsChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
		{
			d.CoerceValue(RatingsControl.MinimumProperty);
			d.CoerceValue(RatingsControl.MaximumProperty);
			RatingsControl.SetupStars((RatingsControl)d);
		}

		// Token: 0x060000EE RID: 238 RVA: 0x000033C0 File Offset: 0x000015C0
		private static object CoerceNumberOfStarsValue(DependencyObject d, object value)
		{
			RatingsControl ratingsControl = (RatingsControl)d;
			int num = (int)value;
			if (num < ratingsControl.Minimum)
			{
				num = ratingsControl.Minimum;
			}
			if (num > ratingsControl.Maximum)
			{
				num = ratingsControl.Maximum;
			}
			return num;
		}

		// Token: 0x17000068 RID: 104
		// (get) Token: 0x060000EF RID: 239 RVA: 0x00003401 File Offset: 0x00001601
		// (set) Token: 0x060000F0 RID: 240 RVA: 0x00003413 File Offset: 0x00001613
		public int Maximum
		{
			get
			{
				return (int)base.GetValue(RatingsControl.MaximumProperty);
			}
			set
			{
				base.SetValue(RatingsControl.MaximumProperty, value);
			}
		}

		// Token: 0x17000069 RID: 105
		// (get) Token: 0x060000F1 RID: 241 RVA: 0x00003426 File Offset: 0x00001626
		// (set) Token: 0x060000F2 RID: 242 RVA: 0x00003438 File Offset: 0x00001638
		public int Minimum
		{
			get
			{
				return (int)base.GetValue(RatingsControl.MinimumProperty);
			}
			set
			{
				base.SetValue(RatingsControl.MinimumProperty, value);
			}
		}

		// Token: 0x060000F3 RID: 243 RVA: 0x0000344C File Offset: 0x0000164C
		private static void SetupStars(RatingsControl ratingsControl)
		{
			float num = ratingsControl.Value;
			ratingsControl.spStars.Children.Clear();
			for (int i = 0; i < ratingsControl.NumberOfStars; i++)
			{
				Image image = new Image();
				image.Height = 23.0;
				image.Width = 23.0;
				if (num >= 1f)
				{
					image.Source = (ImageSource)new ImageSourceConverter().ConvertFromString("pack://application:,,,/images/AnhSao/Sao.png");
				}
				else if (num > 0f)
				{
					image.Source = (ImageSource)new ImageSourceConverter().ConvertFromString("pack://application:,,,/images/AnhSao/NuaSao.png");
				}
				else
				{
					image.Source = (ImageSource)new ImageSourceConverter().ConvertFromString("pack://application:,,,/images/AnhSao/KhongSao.png");
				}
				num -= 1f;
				ratingsControl.spStars.Children.Insert(i, image);
			}
		}

		// Token: 0x060000F4 RID: 244 RVA: 0x00003528 File Offset: 0x00001728
		[DebuggerNonUserCode]
		[GeneratedCode("PresentationBuildTasks", "4.0.0.0")]
		public void InitializeComponent()
		{
			if (this._contentLoaded)
			{
				return;
			}
			this._contentLoaded = true;
			Uri uri = new Uri("/Bookworm;component/custcontrol/ratingscontrol.xaml", UriKind.Relative);
			Application.LoadComponent(this, uri);
		}

		// Token: 0x060000F5 RID: 245 RVA: 0x00003558 File Offset: 0x00001758
		[DebuggerNonUserCode]
		[GeneratedCode("PresentationBuildTasks", "4.0.0.0")]
		[EditorBrowsable(EditorBrowsableState.Never)]
		void IComponentConnector.Connect(int connectionId, object target)
		{
			if (connectionId == 1)
			{
				this.spStars = (StackPanel)target;
				return;
			}
			this._contentLoaded = true;
		}

		// Token: 0x04000064 RID: 100
		public static readonly DependencyProperty BackgroundColorProperty = DependencyProperty.Register("BackgroundColor", typeof(SolidColorBrush), typeof(RatingsControl), new FrameworkPropertyMetadata(Brushes.Transparent, new PropertyChangedCallback(RatingsControl.OnBackgroundColorChanged)));

		// Token: 0x04000065 RID: 101
		public static readonly DependencyProperty StarForegroundColorProperty = DependencyProperty.Register("StarForegroundColor", typeof(SolidColorBrush), typeof(RatingsControl), new FrameworkPropertyMetadata(Brushes.Transparent, new PropertyChangedCallback(RatingsControl.OnStarForegroundColorChanged)));

		// Token: 0x04000066 RID: 102
		public static readonly DependencyProperty StarOutlineColorProperty = DependencyProperty.Register("StarOutlineColor", typeof(SolidColorBrush), typeof(RatingsControl), new FrameworkPropertyMetadata(Brushes.Transparent, new PropertyChangedCallback(RatingsControl.OnStarOutlineColorChanged)));

		// Token: 0x04000067 RID: 103
		public static readonly DependencyProperty ValueProperty = DependencyProperty.Register("Value", typeof(float), typeof(RatingsControl), new FrameworkPropertyMetadata(-1f, new PropertyChangedCallback(RatingsControl.OnValueChanged), new CoerceValueCallback(RatingsControl.CoerceValueValue)));

		// Token: 0x04000068 RID: 104
		public static readonly DependencyProperty NumberOfStarsProperty = DependencyProperty.Register("NumberOfStars", typeof(int), typeof(RatingsControl), new FrameworkPropertyMetadata(5, new PropertyChangedCallback(RatingsControl.OnNumberOfStarsChanged), new CoerceValueCallback(RatingsControl.CoerceNumberOfStarsValue)));

		// Token: 0x04000069 RID: 105
		public static readonly DependencyProperty MaximumProperty = DependencyProperty.Register("Maximum", typeof(int), typeof(RatingsControl), new FrameworkPropertyMetadata(10));

		// Token: 0x0400006A RID: 106
		public static readonly DependencyProperty MinimumProperty = DependencyProperty.Register("Minimum", typeof(int), typeof(RatingsControl), new FrameworkPropertyMetadata(0));

		// Token: 0x0400006B RID: 107
		internal StackPanel spStars;

		// Token: 0x0400006C RID: 108
		private bool _contentLoaded;
	}
}
