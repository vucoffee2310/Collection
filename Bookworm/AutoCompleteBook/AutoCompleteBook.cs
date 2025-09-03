using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Web;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Input;
using Bookworm;
using Bookworm.Utils;
using CustomEntity;
using CustomEntity.Model;
using MaterialDesignThemes.Wpf;

namespace AutoCompleteBook
{
	// Token: 0x02000005 RID: 5
	internal class AutoCompleteBook : TextBox
	{
		// Token: 0x17000005 RID: 5
		// (get) Token: 0x06000013 RID: 19 RVA: 0x000022EA File Offset: 0x000004EA
		private PopupBox Popup
		{
			get
			{
				return base.Template.FindName("PART_Popup", this) as PopupBox;
			}
		}

		// Token: 0x17000006 RID: 6
		// (get) Token: 0x06000014 RID: 20 RVA: 0x00002302 File Offset: 0x00000502
		private ListBox ItemList
		{
			get
			{
				return base.Template.FindName("PART_ItemList", this) as ListBox;
			}
		}

		// Token: 0x17000007 RID: 7
		// (get) Token: 0x06000015 RID: 21 RVA: 0x0000231A File Offset: 0x0000051A
		// (set) Token: 0x06000016 RID: 22 RVA: 0x00002322 File Offset: 0x00000522
		public CirPatron SelectItem { get; set; }

		// Token: 0x17000008 RID: 8
		// (get) Token: 0x06000018 RID: 24 RVA: 0x00002334 File Offset: 0x00000534
		// (set) Token: 0x06000017 RID: 23 RVA: 0x0000232B File Offset: 0x0000052B
		public Style ItemContainerStyle { get; set; }

		// Token: 0x17000009 RID: 9
		// (get) Token: 0x06000019 RID: 25 RVA: 0x0000233C File Offset: 0x0000053C
		// (set) Token: 0x0600001A RID: 26 RVA: 0x00002344 File Offset: 0x00000544
		public Func<object, string, bool> Filter { get; set; }

		// Token: 0x1700000A RID: 10
		// (get) Token: 0x0600001B RID: 27 RVA: 0x0000234D File Offset: 0x0000054D
		// (set) Token: 0x0600001C RID: 28 RVA: 0x00002355 File Offset: 0x00000555
		public string QueryString
		{
			get
			{
				return this.sQueryString;
			}
			set
			{
				this.sQueryString = value;
			}
		}

		// Token: 0x1700000B RID: 11
		// (get) Token: 0x0600001D RID: 29 RVA: 0x0000235E File Offset: 0x0000055E
		// (set) Token: 0x0600001E RID: 30 RVA: 0x00002366 File Offset: 0x00000566
		public ResData ResponseQuery
		{
			get
			{
				return this.oResponseQuery;
			}
			set
			{
				this.oResponseQuery = value;
			}
		}

		// Token: 0x1700000C RID: 12
		// (get) Token: 0x0600001F RID: 31 RVA: 0x0000236F File Offset: 0x0000056F
		// (set) Token: 0x06000020 RID: 32 RVA: 0x00002377 File Offset: 0x00000577
		public string SearchBy
		{
			get
			{
				return this.sSearchBy;
			}
			set
			{
				this.sSearchBy = value;
			}
		}

		// Token: 0x1700000D RID: 13
		// (get) Token: 0x06000021 RID: 33 RVA: 0x00002380 File Offset: 0x00000580
		// (set) Token: 0x06000022 RID: 34 RVA: 0x00002388 File Offset: 0x00000588
		public string SortBy
		{
			get
			{
				return this.sSortBy;
			}
			set
			{
				this.sSortBy = value;
			}
		}

		// Token: 0x1700000E RID: 14
		// (get) Token: 0x06000023 RID: 35 RVA: 0x00002391 File Offset: 0x00000591
		// (set) Token: 0x06000024 RID: 36 RVA: 0x00002399 File Offset: 0x00000599
		public int StartRecord
		{
			get
			{
				return this.iStartRecord;
			}
			set
			{
				this.iStartRecord = value;
			}
		}

		// Token: 0x1700000F RID: 15
		// (get) Token: 0x06000025 RID: 37 RVA: 0x000023A2 File Offset: 0x000005A2
		// (set) Token: 0x06000026 RID: 38 RVA: 0x000023AA File Offset: 0x000005AA
		public int RowsReturn
		{
			get
			{
				return this.iRowsReturn;
			}
			set
			{
				this.iRowsReturn = value;
			}
		}

		// Token: 0x17000010 RID: 16
		// (get) Token: 0x06000027 RID: 39 RVA: 0x000023B3 File Offset: 0x000005B3
		// (set) Token: 0x06000028 RID: 40 RVA: 0x000023BB File Offset: 0x000005BB
		public int LimitFacet
		{
			get
			{
				return this._LimitFacet;
			}
			set
			{
				this._LimitFacet = value;
			}
		}

		// Token: 0x17000011 RID: 17
		// (get) Token: 0x06000029 RID: 41 RVA: 0x000023C4 File Offset: 0x000005C4
		public Dictionary<string, string> NhaXuatBan
		{
			get
			{
				return this._NhaXuatBan;
			}
		}

		// Token: 0x17000012 RID: 18
		// (get) Token: 0x0600002A RID: 42 RVA: 0x000023CC File Offset: 0x000005CC
		public Dictionary<string, string> NamXuatBan
		{
			get
			{
				return this._NamXuatBan;
			}
		}

		// Token: 0x17000013 RID: 19
		// (get) Token: 0x0600002B RID: 43 RVA: 0x000023D4 File Offset: 0x000005D4
		public Dictionary<string, string> TuKhoa
		{
			get
			{
				return this._TuKhoa;
			}
		}

		// Token: 0x17000014 RID: 20
		// (get) Token: 0x0600002C RID: 44 RVA: 0x000023DC File Offset: 0x000005DC
		public Dictionary<string, string> DDC
		{
			get
			{
				return this._DDC;
			}
		}

		// Token: 0x17000015 RID: 21
		// (get) Token: 0x0600002D RID: 45 RVA: 0x000023E4 File Offset: 0x000005E4
		public Dictionary<string, string> TacGia
		{
			get
			{
				return this._TacGia;
			}
		}

		// Token: 0x17000016 RID: 22
		// (get) Token: 0x0600002E RID: 46 RVA: 0x000023EC File Offset: 0x000005EC
		public Dictionary<string, string> NgonNgu
		{
			get
			{
				return this._NgonNgu;
			}
		}

		// Token: 0x17000017 RID: 23
		// (get) Token: 0x0600002F RID: 47 RVA: 0x000023F4 File Offset: 0x000005F4
		public Dictionary<string, string> LoaiTaiLieu
		{
			get
			{
				return this._LoaiTaiLieu;
			}
		}

		// Token: 0x06000030 RID: 48 RVA: 0x000023FC File Offset: 0x000005FC
		public override void OnApplyTemplate()
		{
			base.OnApplyTemplate();
			if (this.ItemList != null && this.Popup != null)
			{
				this.ItemList.SelectionChanged += this.Test;
				this.ItemList.SelectedValuePath = "Text";
				this.ItemList.DisplayMemberPath = "Text";
				this.ItemList.Items.Clear();
				Binding binding = new Binding
				{
					Path = new PropertyPath("ItemContainerStyle", Array.Empty<object>()),
					Source = this
				};
				BindingOperations.SetBinding(this.ItemList, ItemsControl.ItemContainerStyleProperty, binding);
			}
		}

		// Token: 0x06000031 RID: 49 RVA: 0x0000249D File Offset: 0x0000069D
		private void AutoCompleteBook_KeyDown(object sender, KeyEventArgs e)
		{
			if (e.Key == Key.Return)
			{
				this.Popup.IsPopupOpen = false;
				this.UpdateSource();
			}
		}

		// Token: 0x06000032 RID: 50 RVA: 0x000024BC File Offset: 0x000006BC
		private void ItemList_KeyDown(object sender, KeyEventArgs e)
		{
			if (e.OriginalSource is ListBoxItem)
			{
				ListBoxItem listBoxItem = e.OriginalSource as ListBoxItem;
				base.Text = listBoxItem.Content as string;
				if (e.Key == Key.Return)
				{
					this.Popup.IsPopupOpen = false;
					this.UpdateSource();
				}
			}
		}

		// Token: 0x06000033 RID: 51 RVA: 0x0000250E File Offset: 0x0000070E
		private void UpdateSource()
		{
			if (base.GetBindingExpression(TextBox.TextProperty) != null)
			{
				base.GetBindingExpression(TextBox.TextProperty).UpdateSource();
			}
		}

		// Token: 0x06000034 RID: 52 RVA: 0x00002530 File Offset: 0x00000730
		private void ItemList_PreviewMouseDown(object sender, MouseButtonEventArgs e)
		{
			if (e.LeftButton == MouseButtonState.Pressed)
			{
				TextBlock textBlock = e.OriginalSource as TextBlock;
				if (textBlock != null)
				{
					base.Text = textBlock.Text;
					this.UpdateSource();
					this.Popup.IsPopupOpen = false;
					e.Handled = true;
				}
			}
		}

		// Token: 0x06000035 RID: 53 RVA: 0x0000257C File Offset: 0x0000077C
		private void AutoCompleteBook_PreviewKeyDown(object sender, KeyEventArgs e)
		{
			if (e.Key == Key.Down && this.ItemList.Items.Count > 0 && !(e.OriginalSource is ListBoxItem))
			{
				this.ItemList.Focus();
				this.ItemList.SelectedIndex = 0;
				ListBoxItem listBoxItem = this.ItemList.ItemContainerGenerator.ContainerFromIndex(this.ItemList.SelectedIndex) as ListBoxItem;
				if (listBoxItem != null)
				{
					listBoxItem.Focus();
				}
				e.Handled = true;
			}
		}

		// Token: 0x06000036 RID: 54 RVA: 0x00002600 File Offset: 0x00000800
		protected override void OnTextChanged(TextChangedEventArgs e)
		{
			base.OnTextChanged(e);
			if (base.Text != "")
			{
				SearchBookEngServiceResult dataFromServices = UtilContants.GetDataFromServices<SearchBookEngServiceResult>(string.Format("{8}{0}{1}/{2}/{3}/{4}/{5}/{6}/{7}", new object[]
				{
					"/cbs/products/Search/",
					base.Text,
					0,
					0,
					this.currentPageIndex + 1,
					15,
					MainApp.currentLibrary.ID,
					MainApp.LoggedUserID,
					MainApp.currentLibrary.Domain
				}), Common.RequestMethod.GET, "");
				if (dataFromServices != null)
				{
					if (dataFromServices.SearchResult != null && dataFromServices.SearchResult.ProductList != null && dataFromServices.SearchResult.ProductList.Count > 0)
					{
						this.ItemList.ItemsSource = dataFromServices.SearchResult.ProductList.Select((BookData x) => new CirPatron
						{
							Id = x.ID.ToString(),
							Text = x.ProductTitle
						});
					}
					if (this.Popup != null && this.ItemList != null && this.ItemList.ItemsSource != null && this.ItemList.Items.Count > 0)
					{
						this.Popup.IsPopupOpen = true;
						return;
					}
				}
			}
			else
			{
				this.Popup.IsPopupOpen = false;
			}
		}

		// Token: 0x06000037 RID: 55 RVA: 0x00002768 File Offset: 0x00000968
		private void Test(object sender, SelectionChangedEventArgs e)
		{
			CirPatron cirPatron = (CirPatron)this.ItemList.SelectedItem;
			if (cirPatron != null)
			{
				base.Text = cirPatron.Text;
				this.SelectItem = cirPatron;
				this.UpdateSource();
				this.Popup.IsPopupOpen = false;
			}
		}

		// Token: 0x06000038 RID: 56 RVA: 0x000027B0 File Offset: 0x000009B0
		public string RemoveSpecialCharacters(string strSearch)
		{
			StringBuilder stringBuilder = new StringBuilder();
			foreach (char c in strSearch)
			{
				if (c != '"' && c != '\\')
				{
					stringBuilder.Append(c);
				}
			}
			return stringBuilder.ToString();
		}

		// Token: 0x06000039 RID: 57 RVA: 0x000027F8 File Offset: 0x000009F8
		private string FormingSimple(string sVal)
		{
			string text = string.Empty;
			if (this.sSearchBy == SearchByENUM.NamXuatBan)
			{
				text = "?q=" + HttpUtility.UrlEncode(this.sSearchBy);
				if (sVal.IndexOf("-") > -1)
				{
					string[] array = sVal.Trim().Split(new char[] { '-' });
					if (array[0].Trim().Length > 0)
					{
						text += HttpUtility.UrlEncode(":[" + array[0] + " TO ");
					}
					else
					{
						text += HttpUtility.UrlEncode(":[* TO ");
					}
					if (array[1].Trim().Length > 0)
					{
						text += HttpUtility.UrlEncode(array[1] + "]");
					}
					else
					{
						text += HttpUtility.UrlEncode("*]");
					}
				}
				else
				{
					text += HttpUtility.UrlEncode(":\"" + sVal + "\"");
				}
			}
			else
			{
				text = "?q=" + this.SearchByWord(sVal);
			}
			text = text + "&fl=" + HttpUtility.UrlEncode(string.Concat(new string[]
			{
				SearchByENUM.NhanDe,
				",",
				SearchByENUM.NhaXuatBan,
				",",
				SearchByENUM.NamXuatBan,
				",",
				SearchByENUM.MaXepGia,
				",",
				SearchByENUM.TacGia,
				",",
				SearchByENUM.MotaVatLy,
				",",
				SearchByENUM.ItemID,
				",",
				SearchByENUM.EDataID,
				",",
				SearchByENUM.Anhbia,
				",",
				SearchByENUM.DDC,
				",",
				SearchByENUM.NgonNgu,
				",",
				SearchByENUM.LoaiTaiLieu
			}));
			if (this.sSortBy.Length > 0)
			{
				text = text + "&sort=" + HttpUtility.UrlEncode(this.sSortBy + " asc");
			}
			else if (this.sSearchBy == SearchByENUM.NamXuatBan)
			{
				text = text + "&sort=" + HttpUtility.UrlEncode(this.sSearchBy + " asc");
			}
			if (this.iStartRecord > 0)
			{
				text = text + "&start=" + this.iStartRecord.ToString();
			}
			if (this.iRowsReturn > 0)
			{
				text = text + "&rows=" + this.iRowsReturn.ToString();
			}
			return text;
		}

		// Token: 0x0600003A RID: 58 RVA: 0x00002A98 File Offset: 0x00000C98
		private string SearchByWord(string sVal)
		{
			string text = string.Empty;
			string[] array = sVal.Split(new char[] { ' ' });
			if (array.Length != 0)
			{
				int num = 0;
				foreach (string text2 in array)
				{
					if (text2 != "")
					{
						if (num > 0)
						{
							text += " AND ";
						}
						text += HttpUtility.UrlEncode(this.sSearchBy + ":\"*" + this.ConvertUnicode(text2.Trim()) + "*\"");
						num++;
					}
				}
			}
			return text;
		}

		// Token: 0x0600003B RID: 59 RVA: 0x00002B2E File Offset: 0x00000D2E
		private string ConvertUnicode(string sWord)
		{
			return sWord.Normalize(NormalizationForm.FormC);
		}

		// Token: 0x04000007 RID: 7
		public static readonly DependencyProperty ContainerItemStyleproperty = DependencyProperty.Register("ItemContainerStyle", typeof(Style), typeof(AutoCompleteBook));

		// Token: 0x04000009 RID: 9
		public static readonly DependencyProperty Filterproperty = DependencyProperty.Register("Filter", typeof(Predicate<object>), typeof(AutoCompleteBook));

		// Token: 0x0400000A RID: 10
		private string sQueryString = string.Empty;

		// Token: 0x0400000B RID: 11
		private ResData oResponseQuery;

		// Token: 0x0400000C RID: 12
		private string sSearchBy = "fulltext";

		// Token: 0x0400000D RID: 13
		private string sSortBy = string.Empty;

		// Token: 0x0400000E RID: 14
		private int iStartRecord;

		// Token: 0x0400000F RID: 15
		private int iRowsReturn;

		// Token: 0x04000010 RID: 16
		private int _LimitFacet = 5;

		// Token: 0x04000011 RID: 17
		private Dictionary<string, string> _NhaXuatBan;

		// Token: 0x04000012 RID: 18
		private Dictionary<string, string> _NamXuatBan;

		// Token: 0x04000013 RID: 19
		private Dictionary<string, string> _TuKhoa;

		// Token: 0x04000014 RID: 20
		private Dictionary<string, string> _DDC;

		// Token: 0x04000015 RID: 21
		private Dictionary<string, string> _TacGia;

		// Token: 0x04000016 RID: 22
		private Dictionary<string, string> _NgonNgu;

		// Token: 0x04000017 RID: 23
		private Dictionary<string, string> _LoaiTaiLieu;

		// Token: 0x04000018 RID: 24
		private int currentPageIndex;
	}
}
